import type { Folio, Project, ChapterTitleFormat } from '@shared/types'
import { DEFAULT_CHAPTER_TITLE_FORMAT } from '../stores/uiStore'

export type ExportFormat = 'epub' | 'pdf' | 'docx'

export interface CompiledChapter {
  index: number
  title: string
  subtitle: string
  timeline: string
  location: string
  titleFormat: ChapterTitleFormat
  htmlContent: string
  printableHtmlContent: string
  xhtmlContent: string
  blocks: Array<{
    type: 'p' | 'h1' | 'h2' | 'h3' | 'blockquote' | 'scenebreak'
    text: string
  }>
}

export interface CompiledManuscript {
  projectTitle: string
  projectSynopsis: string
  sanitizedBaseName: string
  chapters: CompiledChapter[]
  exportedAtIso: string
}

/**
 * Sanea el título del proyecto para generar un nombre de archivo limpio (ej. "nombre-del-libro").
 */
export function sanitizeProjectFilename(rawTitle?: string | null): string {
  const fallback = 'manuscrito-folio'
  if (!rawTitle || !rawTitle.trim()) return fallback

  const slug = rawTitle
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug || fallback
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Convierte el HTML de TipTap en bloques estructurados y XHTML válido para EPUB/DOCX/PDF.
 */
function parseChapterHtml(rawHtml: string): {
  xhtmlContent: string
  printableHtmlContent: string
  blocks: CompiledChapter['blocks']
} {
  const parser = new DOMParser()
  const doc = parser.parseFromString(`<div>${rawHtml || ''}</div>`, 'text/html')
  const container = doc.body.firstElementChild

  const blocks: CompiledChapter['blocks'] = []
  const xhtmlParts: string[] = []
  const printableParts: string[] = []

  if (!container) {
    return { xhtmlContent: '<p></p>', printableHtmlContent: '<p></p>', blocks: [] }
  }

  for (const node of Array.from(container.children)) {
    const tag = node.tagName.toLowerCase()

    if (tag === 'hr' || (tag === 'div' && node.getAttribute('data-type') === 'scene-break')) {
      blocks.push({ type: 'scenebreak', text: '* * *' })
      xhtmlParts.push('<p class="scene-break">* * *</p>')
      printableParts.push('<p class="scene-break">* * *</p>')
      continue
    }

    const text = (node.textContent || '').trim()
    if (!text) continue

    // Preservar HTML interno con estilos inline (font-size decimal, font-family, color, text-align) para PDF
    printableParts.push(node.outerHTML)

    if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
      blocks.push({ type: tag, text })
      xhtmlParts.push(`<${tag}>${escapeXml(text)}</${tag}>`)
    } else if (tag === 'blockquote') {
      blocks.push({ type: 'blockquote', text })
      xhtmlParts.push(`<blockquote><p>${escapeXml(text)}</p></blockquote>`)
    } else if (tag === 'ul' || tag === 'ol') {
      const items = Array.from(node.querySelectorAll('li'))
        .map((li) => (li.textContent || '').trim())
        .filter(Boolean)
      for (const itemText of items) {
        blocks.push({ type: 'p', text: `• ${itemText}` })
      }
      if (items.length > 0) {
        const liXml = items.map((i) => `<li>${escapeXml(i)}</li>`).join('')
        xhtmlParts.push(`<${tag}>${liXml}</${tag}>`)
      }
    } else {
      blocks.push({ type: 'p', text })
      xhtmlParts.push(`<p>${escapeXml(text)}</p>`)
    }
  }

  if (xhtmlParts.length === 0) {
    const fallbackText = (container.textContent || '').trim()
    if (fallbackText) {
      blocks.push({ type: 'p', text: fallbackText })
      xhtmlParts.push(`<p>${escapeXml(fallbackText)}</p>`)
      printableParts.push(`<p>${escapeXml(fallbackText)}</p>`)
    } else {
      xhtmlParts.push('<p>&#160;</p>')
      printableParts.push('<p>&#160;</p>')
    }
  }

  return {
    xhtmlContent: xhtmlParts.join('\n'),
    printableHtmlContent: printableParts.join('\n'),
    blocks
  }
}

/**
 * Recopila en orden secuencial todos los capítulos activos del manuscrito,
 * aplicando el formato de encabezado por capítulo o el global del libro.
 */
export function collectActiveManuscript(
  project: Project | null | undefined,
  chapters: Folio[],
  globalTitleFormat: ChapterTitleFormat = DEFAULT_CHAPTER_TITLE_FORMAT
): CompiledManuscript {
  const projectTitle = project?.title?.trim() || 'Manuscrito sin título'
  const projectSynopsis = project?.synopsis?.trim() || ''
  const sanitizedBaseName = sanitizeProjectFilename(projectTitle)

  const sortedActive = [...chapters]
    .filter((c) => !c.isArchived && c.includeInExport !== false)
    .sort((a, b) => a.orderIndex - b.orderIndex)

  const compiledChapters: CompiledChapter[] = sortedActive.map((chap, idx) => {
    const { xhtmlContent, printableHtmlContent, blocks } = parseChapterHtml(chap.content || '')
    const resolvedFormat: ChapterTitleFormat = chap.chapterTitleFormat
      ? { ...chap.chapterTitleFormat }
      : { ...globalTitleFormat }

    return {
      index: idx + 1,
      title: chap.title?.trim() || `Capítulo ${idx + 1}`,
      subtitle: chap.subtitle?.trim() || '',
      timeline: chap.timeline?.trim() || '',
      location: chap.location?.trim() || '',
      titleFormat: resolvedFormat,
      htmlContent: chap.content || '',
      printableHtmlContent,
      xhtmlContent,
      blocks
    }
  })

  return {
    projectTitle,
    projectSynopsis,
    sanitizedBaseName,
    chapters: compiledChapters,
    exportedAtIso: new Date().toISOString()
  }
}

/**
 * Empaqueta archivos en un contenedor ZIP estándar (compatible con EPUB y DOCX OpenXML) sin dependencias externas.
 */
const CRC32_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[i] = c >>> 0
  }
  return table
})()

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < data.length; i++) {
    crc = CRC32_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function createStoreZipArchive(
  files: Array<{ path: string; content: string | Uint8Array }>
): Uint8Array {
  const encoder = new TextEncoder()
  const localChunks: Uint8Array[] = []
  const centralChunks: Uint8Array[] = []
  let offset = 0

  for (const file of files) {
    const nameBytes = encoder.encode(file.path)
    const dataBytes =
      typeof file.content === 'string' ? encoder.encode(file.content) : file.content
    const crc = crc32(dataBytes)
    const size = dataBytes.length

    // Local file header (30 bytes + name + data)
    const localHeader = new Uint8Array(30 + nameBytes.length)
    const lv = new DataView(localHeader.buffer)
    lv.setUint32(0, 0x04034b50, true) // signature
    lv.setUint16(4, 20, true) // version needed
    lv.setUint16(6, 0x0800, true) // UTF-8 flag
    lv.setUint16(8, 0, true) // store method (0 = uncompressed)
    lv.setUint16(10, 0, true) // mod time
    lv.setUint16(12, 0x21, true) // mod date
    lv.setUint32(14, crc, true)
    lv.setUint32(18, size, true)
    lv.setUint32(22, size, true)
    lv.setUint16(26, nameBytes.length, true)
    lv.setUint16(28, 0, true)
    localHeader.set(nameBytes, 30)

    localChunks.push(localHeader, dataBytes)

    // Central directory header (46 bytes + name)
    const centralHeader = new Uint8Array(46 + nameBytes.length)
    const cv = new DataView(centralHeader.buffer)
    cv.setUint32(0, 0x02014b50, true) // signature
    cv.setUint16(4, 20, true) // version made by
    cv.setUint16(6, 20, true) // version needed
    cv.setUint16(8, 0x0800, true) // UTF-8 flag
    cv.setUint16(10, 0, true) // store method
    cv.setUint16(12, 0, true)
    cv.setUint16(14, 0x21, true)
    cv.setUint32(16, crc, true)
    cv.setUint32(20, size, true)
    cv.setUint32(24, size, true)
    cv.setUint16(28, nameBytes.length, true)
    cv.setUint16(30, 0, true)
    cv.setUint16(32, 0, true)
    cv.setUint16(34, 0, true)
    cv.setUint16(36, 0, true)
    cv.setUint32(38, 0, true)
    cv.setUint32(42, offset, true)
    centralHeader.set(nameBytes, 46)

    centralChunks.push(centralHeader)
    offset += localHeader.length + dataBytes.length
  }

  const centralSize = centralChunks.reduce((acc, c) => acc + c.length, 0)
  const eocd = new Uint8Array(22)
  const ev = new DataView(eocd.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(4, 0, true)
  ev.setUint16(6, 0, true)
  ev.setUint16(8, files.length, true)
  ev.setUint16(10, files.length, true)
  ev.setUint32(12, centralSize, true)
  ev.setUint32(16, offset, true)
  ev.setUint16(20, 0, true)

  const totalLength = offset + centralSize + eocd.length
  const output = new Uint8Array(totalLength)
  let cursor = 0
  for (const chunk of localChunks) {
    output.set(chunk, cursor)
    cursor += chunk.length
  }
  for (const chunk of centralChunks) {
    output.set(chunk, cursor)
    cursor += chunk.length
  }
  output.set(eocd, cursor)

  return output
}

/**
 * Descarga directa en el navegador/Electron con el nombre saneado del libro.
 */
export function triggerFileDownload(
  bytes: Uint8Array | Blob,
  filename: string,
  mimeType: string
): void {
  const blob =
    bytes instanceof Blob
      ? bytes
      : new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer], {
          type: mimeType
        })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

/**
 * 1. Generador EPUB 3.0 (.epub)
 */
export async function exportManuscriptToEpub(manuscript: CompiledManuscript): Promise<string> {
  const bookId = `urn:uuid:${crypto.randomUUID()}`
  const files: Array<{ path: string; content: string | Uint8Array }> = []

  // El archivo mimetype DEBE ser el primero en un contenedor EPUB sin compresión
  files.push({
    path: 'mimetype',
    content: 'application/epub+zip'
  })

  files.push({
    path: 'META-INF/container.xml',
    content: `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
  })

  files.push({
    path: 'OEBPS/styles.css',
    content: `body { font-family: Georgia, "Times New Roman", serif; line-height: 1.75; margin: 5%; color: #1f1d1a; }
h1.chapter-title { font-size: 1.8em; margin-top: 1.5em; margin-bottom: 0.25em; text-align: center; font-weight: bold; }
p.chapter-subtitle { font-style: italic; text-align: center; color: #5c574f; margin-top: 0; margin-bottom: 0.8em; }
p.chapter-meta { font-size: 0.8em; text-align: center; color: #7a7369; margin-bottom: 2em; }
p { margin-top: 0; margin-bottom: 0.9em; text-indent: 1.4em; text-align: justify; }
p.scene-break { text-align: center; text-indent: 0; margin: 1.8em 0; letter-spacing: 0.35em; color: #6e675f; }
blockquote { margin: 1.2em 1.5em; font-style: italic; color: #4a453e; }`
  })

  files.push({
    path: 'OEBPS/titlepage.xhtml',
    content: `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="es" lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>${escapeXml(manuscript.projectTitle)}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <div style="text-align:center; margin-top: 25%;">
    <h1 class="chapter-title">${escapeXml(manuscript.projectTitle)}</h1>
    ${manuscript.projectSynopsis ? `<p class="chapter-subtitle">${escapeXml(manuscript.projectSynopsis)}</p>` : ''}
  </div>
</body>
</html>`
  })

  const manifestItems: string[] = [
    `<item id="css" href="styles.css" media-type="text/css"/>`,
    `<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>`,
    `<item id="titlepage" href="titlepage.xhtml" media-type="application/xhtml+xml"/>`
  ]
  const spineItems: string[] = [`<itemref idref="titlepage"/>`]
  const navLinks: string[] = [`<li><a href="titlepage.xhtml">Portada</a></li>`]

  for (const chap of manuscript.chapters) {
    const fileId = `chapter-${chap.index}`
    const fileName = `${fileId}.xhtml`
    const metaParts = [chap.timeline, chap.location].filter(Boolean).join(' · ')

    files.push({
      path: `OEBPS/${fileName}`,
      content: `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="es" lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>${escapeXml(chap.title)}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <section>
    <h1 class="chapter-title">${escapeXml(chap.title)}</h1>
    ${chap.subtitle ? `<p class="chapter-subtitle">${escapeXml(chap.subtitle)}</p>` : ''}
    ${metaParts ? `<p class="chapter-meta">${escapeXml(metaParts)}</p>` : ''}
    ${chap.xhtmlContent}
  </section>
</body>
</html>`
    })

    manifestItems.push(`<item id="${fileId}" href="${fileName}" media-type="application/xhtml+xml"/>`)
    spineItems.push(`<itemref idref="${fileId}"/>`)
    navLinks.push(`<li><a href="${fileName}">${escapeXml(chap.title)}</a></li>`)
  }

  files.push({
    path: 'OEBPS/nav.xhtml',
    content: `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="es" lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Índice</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1 class="chapter-title">Índice</h1>
    <ol>
      ${navLinks.join('\n      ')}
    </ol>
  </nav>
</body>
</html>`
  })

  const modifiedIso = manuscript.exportedAtIso.replace(/\.\d+Z$/, 'Z')
  files.push({
    path: 'OEBPS/content.opf',
    content: `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="BookId" xml:lang="es">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="BookId">${bookId}</dc:identifier>
    <dc:title>${escapeXml(manuscript.projectTitle)}</dc:title>
    <dc:language>es</dc:language>
    <meta property="dcterms:modified">${modifiedIso}</meta>
  </metadata>
  <manifest>
    ${manifestItems.join('\n    ')}
  </manifest>
  <spine>
    ${spineItems.join('\n    ')}
  </spine>
</package>`
  })

  const zipBytes = createStoreZipArchive(files)
  const filename = `${manuscript.sanitizedBaseName}.epub`
  triggerFileDownload(zipBytes, filename, 'application/epub+zip')
  return filename
}

/**
 * 2. Generador PDF (.pdf) maquetado para lectura o impresión
 * Sincroniza de forma idéntica las propiedades CSS del encabezado del capítulo (chapterTitleFormat)
 * y los tamaños tipográficos decimales del cuerpo del editor.
 */
export async function exportManuscriptToPdf(manuscript: CompiledManuscript): Promise<string> {
  const chaptersHtml = manuscript.chapters
    .map((chap) => {
      const metaParts = [chap.timeline, chap.location].filter(Boolean).join(' · ')
      const fmt = chap.titleFormat
      const alignCss = fmt.alignment || 'left'
      const borderCss = fmt.showDivider ? '1px solid #d6d3d1' : 'none'
      const paddingBottomCss = fmt.showDivider ? '14pt' : '4pt'
      const fontFamilyCss = fmt.fontFamily || "Georgia, 'Times New Roman', serif"
      const fontSizeCss = `${fmt.fontSize || 32}px`
      const colorCss = fmt.color || '#1c1917'

      return `
      <section class="chapter-page">
        <header
          class="chapter-header"
          style="text-align: ${alignCss}; border-bottom: ${borderCss}; padding-bottom: ${paddingBottomCss};"
        >
          <h2
            class="chapter-title"
            style="text-align: ${alignCss}; font-family: ${escapeXml(fontFamilyCss)}; font-size: ${fontSizeCss}; color: ${escapeXml(colorCss)};"
          >${escapeXml(chap.title)}</h2>
          ${chap.subtitle ? `<p class="chapter-subtitle" style="text-align: ${alignCss};">${escapeXml(chap.subtitle)}</p>` : ''}
          ${metaParts ? `<p class="chapter-meta" style="text-align: ${alignCss};">${escapeXml(metaParts)}</p>` : ''}
        </header>
        <div class="chapter-body">
          ${chap.printableHtmlContent}
        </div>
      </section>`
    })
    .join('\n')

  const fullPrintableHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>${escapeXml(manuscript.projectTitle)}</title>
  <style>
    @page { size: A4; margin: 22mm 24mm; }
    body {
      font-family: Georgia, 'Times New Roman', serif;
      color: #1c1917;
      line-height: 1.75;
      font-size: 12pt;
      margin: 0;
      padding: 0;
    }
    .cover-page {
      min-height: 75vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      page-break-after: always;
    }
    .book-title {
      font-size: 28pt;
      font-weight: bold;
      margin-bottom: 12pt;
      letter-spacing: -0.02em;
    }
    .book-synopsis {
      font-size: 12pt;
      font-style: italic;
      color: #57534e;
      max-width: 80%;
    }
    .chapter-page {
      page-break-before: always;
    }
    .chapter-header {
      text-align: center;
      margin-top: 24pt;
      margin-bottom: 24pt;
      padding-bottom: 14pt;
      border-bottom: 1px solid #d6d3d1;
    }
    .chapter-title {
      font-size: 20pt;
      font-weight: bold;
      margin: 0 0 6pt 0;
    }
    .chapter-subtitle {
      font-size: 11.5pt;
      font-style: italic;
      color: #57534e;
      margin: 0 0 6pt 0;
    }
    .chapter-meta {
      font-size: 9.5pt;
      color: #78716c;
      letter-spacing: 0.04em;
      margin: 0;
    }
    .chapter-body p {
      margin: 0 0 10pt 0;
      text-indent: 1.5em;
      text-align: justify;
    }
    .chapter-body p.scene-break {
      text-align: center;
      text-indent: 0;
      margin: 18pt 0;
      letter-spacing: 0.35em;
      color: #78716c;
    }
    .chapter-body blockquote {
      margin: 14pt 20pt;
      font-style: italic;
      color: #44403c;
    }
  </style>
</head>
<body>
  <section class="cover-page">
    <h1 class="book-title">${escapeXml(manuscript.projectTitle)}</h1>
    ${manuscript.projectSynopsis ? `<p class="book-synopsis">${escapeXml(manuscript.projectSynopsis)}</p>` : ''}
  </section>
  ${chaptersHtml}
</body>
</html>`

  const pdfBytes = await window.api.export.htmlToPdfBuffer(fullPrintableHtml)
  const filename = `${manuscript.sanitizedBaseName}.pdf`
  triggerFileDownload(pdfBytes, filename, 'application/pdf')
  return filename
}

/**
 * 3. Generador Word OpenXML (.docx) editable para corrección o editorial
 */
export async function exportManuscriptToDocx(manuscript: CompiledManuscript): Promise<string> {
  const docParagraphs: string[] = []

  // Portada del manuscrito
  docParagraphs.push(`
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:before="2400" w:after="240"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="52"/></w:rPr><w:t>${escapeXml(manuscript.projectTitle)}</w:t></w:r>
    </w:p>`)

  if (manuscript.projectSynopsis) {
    docParagraphs.push(`
      <w:p>
        <w:pPr><w:jc w:val="center"/><w:spacing w:after="480"/></w:pPr>
        <w:r><w:rPr><w:i/><w:color w:val="57534E"/><w:sz w:val="24"/></w:rPr><w:t>${escapeXml(manuscript.projectSynopsis)}</w:t></w:r>
      </w:p>`)
  }

  for (const chap of manuscript.chapters) {
    // Salto de página antes de cada capítulo
    docParagraphs.push(`<w:p><w:r><w:br w:type="page"/></w:r></w:p>`)

    // Título del capítulo
    docParagraphs.push(`
      <w:p>
        <w:pPr><w:jc w:val="center"/><w:spacing w:before="360" w:after="120"/></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="36"/></w:rPr><w:t>${escapeXml(chap.title)}</w:t></w:r>
      </w:p>`)

    // Subtítulo / Epígrafe opcional
    if (chap.subtitle) {
      docParagraphs.push(`
        <w:p>
          <w:pPr><w:jc w:val="center"/><w:spacing w:after="120"/></w:pPr>
          <w:r><w:rPr><w:i/><w:color w:val="57534E"/><w:sz w:val="22"/></w:rPr><w:t>${escapeXml(chap.subtitle)}</w:t></w:r>
        </w:p>`)
    }

    // Metadatos opcionales (Línea temporal y Ubicación)
    const metaParts = [chap.timeline, chap.location].filter(Boolean).join(' · ')
    if (metaParts) {
      docParagraphs.push(`
        <w:p>
          <w:pPr><w:jc w:val="center"/><w:spacing w:after="320"/></w:pPr>
          <w:r><w:rPr><w:color w:val="78716C"/><w:sz w:val="19"/></w:rPr><w:t>${escapeXml(metaParts)}</w:t></w:r>
        </w:p>`)
    }

    // Bloques de contenido del capítulo
    for (const block of chap.blocks) {
      if (block.type === 'scenebreak') {
        docParagraphs.push(`
          <w:p>
            <w:pPr><w:jc w:val="center"/><w:spacing w:before="240" w:after="240"/></w:pPr>
            <w:r><w:rPr><w:color w:val="78716C"/><w:sz w:val="24"/></w:rPr><w:t>* * *</w:t></w:r>
          </w:p>`)
      } else if (block.type === 'h1' || block.type === 'h2' || block.type === 'h3') {
        docParagraphs.push(`
          <w:p>
            <w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr>
            <w:r><w:rPr><w:b/><w:sz w:val="28"/></w:rPr><w:t>${escapeXml(block.text)}</w:t></w:r>
          </w:p>`)
      } else if (block.type === 'blockquote') {
        docParagraphs.push(`
          <w:p>
            <w:pPr><w:ind w:left="720" w:right="720"/><w:spacing w:before="120" w:after="120"/></w:pPr>
            <w:r><w:rPr><w:i/><w:sz w:val="24"/></w:rPr><w:t>${escapeXml(block.text)}</w:t></w:r>
          </w:p>`)
      } else {
        docParagraphs.push(`
          <w:p>
            <w:pPr><w:jc w:val="both"/><w:ind w:firstLine="420"/><w:spacing w:after="160" w:line="360" w:lineRule="auto"/></w:pPr>
            <w:r><w:rPr><w:rFonts w:ascii="Georgia" w:hAnsi="Georgia"/><w:sz w:val="24"/></w:rPr><w:t xml:space="preserve">${escapeXml(block.text)}</w:t></w:r>
          </w:p>`)
      }
    }
  }

  const files: Array<{ path: string; content: string }> = [
    {
      path: '[Content_Types].xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
    },
    {
      path: '_rels/.rels',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
    },
    {
      path: 'word/_rels/document.xml.rels',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`
    },
    {
      path: 'word/document.xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${docParagraphs.join('\n    ')}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`
    }
  ]

  const zipBytes = createStoreZipArchive(files)
  const filename = `${manuscript.sanitizedBaseName}.docx`
  triggerFileDownload(
    zipBytes,
    filename,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  )
  return filename
}


/**
 * High-performance utility to calculate caret coordinates inside a textarea.
 * Uses a single reusable off-screen mirror DOM node to prevent layout thrashing.
 */

const propertiesToCopy = [
  'direction',
  'boxSizing',
  'width',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'borderStyle',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'fontStyle',
  'fontVariant',
  'fontWeight',
  'fontStretch',
  'fontSize',
  'fontSizeAdjust',
  'lineHeight',
  'fontFamily',
  'textAlign',
  'textTransform',
  'textIndent',
  'textDecoration',
  'letterSpacing',
  'wordSpacing',
  'tabSize',
  'whiteSpace',
  'wordWrap',
  'wordBreak'
] as const

let mirrorNode: HTMLDivElement | null = null
let mirrorTextNode: Text | null = null
let mirrorSpan: HTMLSpanElement | null = null

function getOrCreateMirror(): { div: HTMLDivElement; textNode: Text; span: HTMLSpanElement } {
  if (!mirrorNode || !document.body.contains(mirrorNode)) {
    mirrorNode = document.createElement('div')
    mirrorNode.id = 'folio-caret-mirror-node'
    mirrorNode.style.position = 'absolute'
    mirrorNode.style.top = '0'
    mirrorNode.style.left = '-9999px'
    mirrorNode.style.visibility = 'hidden'
    mirrorNode.style.overflow = 'hidden'
    mirrorNode.style.pointerEvents = 'none'

    mirrorTextNode = document.createTextNode('')
    mirrorSpan = document.createElement('span')

    mirrorNode.appendChild(mirrorTextNode)
    mirrorNode.appendChild(mirrorSpan)
    document.body.appendChild(mirrorNode)
  }
  return { div: mirrorNode, textNode: mirrorTextNode!, span: mirrorSpan! }
}

export function getCaretCoordinates(
  element: HTMLTextAreaElement,
  position: number
): { top: number; left: number; height: number } {
  if (typeof window === 'undefined') {
    return { top: 0, left: 0, height: 32 }
  }

  const { div, textNode, span } = getOrCreateMirror()
  const computed = window.getComputedStyle(element)
  const style = div.style

  style.whiteSpace = 'pre-wrap'
  style.wordWrap = 'break-word'

  for (let i = 0; i < propertiesToCopy.length; i++) {
    const prop = propertiesToCopy[i]
    ;(style as unknown as Record<string, string>)[prop] = (computed as unknown as Record<string, string>)[prop]
  }

  style.width = `${element.clientWidth}px`
  style.boxSizing = 'border-box'

  // Pre-caret text content
  textNode.nodeValue = element.value.substring(0, position)
  span.textContent = element.value.substring(position) || '.'

  const top = span.offsetTop + parseInt(computed.borderTopWidth || '0', 10)
  const left = span.offsetLeft + parseInt(computed.borderLeftWidth || '0', 10)
  const height = parseInt(computed.lineHeight || '32', 10) || span.offsetHeight || 32

  return { top, left, height }
}

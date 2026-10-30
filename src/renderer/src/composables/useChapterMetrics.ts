import { ref, computed, watch, type Ref } from 'vue'
import { useDebounceFn } from '@vueuse/core'

export interface ChapterMetricsSnapshot {
  wordCount: number
  charCount: number
  charCountNoSpaces: number
  readingTimeMinutes: number
  readingTimeLabel: string
  plainText: string
}

const DEFAULT_WPM = 210 // Velocidad estándar de lectura editorial (200 - 220 ppm)

/**
 * Extrae texto plano limpio desde HTML o texto sin contar separadores de escena (* * *).
 */
export function extractPlainTextFromHtml(htmlOrText: string): string {
  if (!htmlOrText) return ''
  const withoutBreaks = htmlOrText.replace(
    /<div[^>]*data-type=["']scene-break["'][^>]*>[\s\S]*?<\/div>/gi,
    ' '
  )
  return withoutBreaks.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Calcula de forma síncrona las métricas editoriales a partir del texto plano del editor.
 */
export function computeMetricsFromText(
  rawText: string,
  wpm: number = DEFAULT_WPM
): ChapterMetricsSnapshot {
  const normalized = (rawText || '').replace(/\r\n/g, '\n')
  const trimmed = normalized.trim()

  const wordCount = trimmed ? trimmed.split(/\s+/).length : 0
  const charCount = normalized.length
  const charCountNoSpaces = normalized.replace(/\s/g, '').length

  let readingTimeMinutes = 0
  let readingTimeLabel = '0 min de lectura'

  if (wordCount > 0) {
    const exactMinutes = wordCount / wpm
    if (exactMinutes < 1) {
      readingTimeMinutes = 1
      readingTimeLabel = '< 1 min de lectura'
    } else {
      readingTimeMinutes = Math.max(1, Math.round(exactMinutes))
      readingTimeLabel = `~${readingTimeMinutes} min de lectura`
    }
  }

  return {
    wordCount,
    charCount,
    charCountNoSpaces,
    readingTimeMinutes,
    readingTimeLabel,
    plainText: rawText
  }
}

/**
 * Composable reactivo de Vue 3 para las métricas discretas del capítulo activo.
 */
export function useChapterMetrics(options?: {
  targetWords?: Ref<number>
  wpm?: number
  debounceMs?: number
}) {
  const wpm = options?.wpm ?? DEFAULT_WPM
  const debounceMs = options?.debounceMs ?? 120

  const wordCount = ref(0)
  const charCount = ref(0)
  const charCountNoSpaces = ref(0)
  const readingTimeMinutes = ref(0)
  const readingTimeLabel = ref('0 min de lectura')
  const showInlineChars = ref(false)

  function applySnapshot(snapshot: ChapterMetricsSnapshot): void {
    wordCount.value = snapshot.wordCount
    charCount.value = snapshot.charCount
    charCountNoSpaces.value = snapshot.charCountNoSpaces
    readingTimeMinutes.value = snapshot.readingTimeMinutes
    readingTimeLabel.value = snapshot.readingTimeLabel
  }

  const updateFromPlainTextDebounced = useDebounceFn((plainText: string) => {
    applySnapshot(computeMetricsFromText(plainText, wpm))
  }, debounceMs)

  function updateFromPlainTextImmediate(plainText: string): ChapterMetricsSnapshot {
    const snap = computeMetricsFromText(plainText, wpm)
    applySnapshot(snap)
    return snap
  }

  function updateFromHtmlImmediate(htmlContent: string): ChapterMetricsSnapshot {
    const plain = extractPlainTextFromHtml(htmlContent)
    return updateFromPlainTextImmediate(plain)
  }

  function resetMetrics(): void {
    wordCount.value = 0
    charCount.value = 0
    charCountNoSpaces.value = 0
    readingTimeMinutes.value = 0
    readingTimeLabel.value = '0 min de lectura'
  }

  const formattedWordCount = computed(() => wordCount.value.toLocaleString('es-ES'))
  const formattedCharCount = computed(() => charCount.value.toLocaleString('es-ES'))
  const formattedCharCountNoSpaces = computed(() =>
    charCountNoSpaces.value.toLocaleString('es-ES')
  )

  const targetWords = computed(() => Math.max(0, options?.targetWords?.value ?? 0))
  const hasTarget = computed(() => targetWords.value > 0)
  const formattedTargetWords = computed(() => targetWords.value.toLocaleString('es-ES'))

  const targetProgressPercent = computed<number>(() => {
    if (targetWords.value <= 0) return 0
    return Math.min(100, Math.round((wordCount.value / targetWords.value) * 100))
  })

  const isTargetReached = computed<boolean>(() => {
    return targetWords.value > 0 && wordCount.value >= targetWords.value
  })

  const charDetailsTooltip = computed(() => {
    return `${formattedWordCount.value} palabras · ${formattedCharCount.value} caracteres (con espacios) · ${formattedCharCountNoSpaces.value} caracteres (sin espacios)`
  })

  if (options?.targetWords) {
    watch(options.targetWords, (val) => {
      if (val < 0 && options.targetWords) {
        options.targetWords.value = 0
      }
    })
  }

  return {
    wordCount,
    charCount,
    charCountNoSpaces,
    readingTimeMinutes,
    readingTimeLabel,
    showInlineChars,
    formattedWordCount,
    formattedCharCount,
    formattedCharCountNoSpaces,
    targetWords,
    hasTarget,
    formattedTargetWords,
    targetProgressPercent,
    isTargetReached,
    charDetailsTooltip,
    applySnapshot,
    updateFromPlainTextDebounced,
    updateFromPlainTextImmediate,
    updateFromHtmlImmediate,
    resetMetrics
  }
}


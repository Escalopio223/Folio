import { ref } from 'vue'
import type { SupportedLanguageCode, LanguagePack } from '../nlp/types'
import type { EchoCluster } from './useEchoDetector'

export * from './useEchoDetector'

export interface EchoRadarConfig {
  enabled: boolean
  windowSizeWords: 60 | 120 | 250
  minRepetitions: 2 | 3
  language: SupportedLanguageCode
}

// Estado reactivo compartido del Radar de Ecos
const isRadarEnabled = ref(false)
const windowSizeWords = ref<60 | 120 | 250>(120)
const minRepetitions = ref<2 | 3>(2)
const radarLanguage = ref<SupportedLanguageCode>('auto')
const ignoredStems = ref<Set<string>>(new Set<string>())
const clustersCount = ref(0)
const detectedLanguageName = ref('Español')
const activeClusters = ref<EchoCluster[]>([])

export function useEchoRadar() {
  function toggleRadar(value?: boolean): void {
    if (value !== undefined) {
      isRadarEnabled.value = value
    } else {
      isRadarEnabled.value = !isRadarEnabled.value
    }
  }

  function setWindowSize(size: 60 | 120 | 250): void {
    windowSizeWords.value = size
  }

  function setMinRepetitions(reps: 2 | 3): void {
    minRepetitions.value = reps
  }

  function setLanguage(lang: SupportedLanguageCode): void {
    radarLanguage.value = lang
  }

  function ignoreStem(stem: string): void {
    const updated = new Set(ignoredStems.value)
    updated.add(stem)
    ignoredStems.value = updated
  }

  function unignoreStem(stem: string): void {
    const updated = new Set(ignoredStems.value)
    updated.delete(stem)
    ignoredStems.value = updated
  }

  function clearIgnoredStems(): void {
    ignoredStems.value = new Set()
  }

  function updateClusters(clusters: EchoCluster[], pack: LanguagePack): void {
    activeClusters.value = clusters
    clustersCount.value = clusters.length
    detectedLanguageName.value = pack.name
  }

  return {
    isRadarEnabled,
    windowSizeWords,
    minRepetitions,
    radarLanguage,
    ignoredStems,
    clustersCount,
    detectedLanguageName,
    activeClusters,
    toggleRadar,
    setWindowSize,
    setMinRepetitions,
    setLanguage,
    ignoreStem,
    unignoreStem,
    clearIgnoredStems,
    updateClusters
  }
}

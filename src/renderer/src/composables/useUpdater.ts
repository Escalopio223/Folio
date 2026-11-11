import { ref, computed } from 'vue'
import type { UpdaterStatusPayload, UpdaterStatusType } from '@shared/types'
import { useFolioStore } from '../stores/folioStore'

const status = ref<UpdaterStatusType>('idle')
const version = ref<string>('')
const releaseUrl = ref<string>('')
const percent = ref<number>(0)
const bytesPerSecond = ref<number>(0)
const transferred = ref<number>(0)
const total = ref<number>(0)
const errorMessage = ref<string>('')

let isSubscribed = false
let unsubscribeFn: (() => void) | null = null

export function useUpdater() {
  const folioStore = useFolioStore()

  function updateFromPayload(payload: UpdaterStatusPayload): void {
    if (!payload || !payload.status) return
    status.value = payload.status
    if (payload.version) version.value = payload.version
    if (payload.releaseUrl) releaseUrl.value = payload.releaseUrl
    if (typeof payload.percent === 'number') percent.value = payload.percent
    if (typeof payload.bytesPerSecond === 'number') bytesPerSecond.value = payload.bytesPerSecond
    if (typeof payload.transferred === 'number') transferred.value = payload.transferred
    if (typeof payload.total === 'number') total.value = payload.total
    if (payload.message) errorMessage.value = payload.message
  }

  async function init(): Promise<void> {
    if (typeof window === 'undefined' || !window.api?.updater) return

    // 1. Obtener estado inicial para evitar race condition
    try {
      const initial = await window.api.updater.getState()
      updateFromPayload(initial)
    } catch (err) {
      console.warn('[useUpdater] Error al consultar estado inicial:', err)
    }

    // 2. Suscribirse a cambios en tiempo real
    if (!isSubscribed) {
      unsubscribeFn = window.api.updater.onStatusChange((payload) => {
        updateFromPayload(payload)
      })
      isSubscribed = true
    }
  }

  function destroy(): void {
    if (unsubscribeFn) {
      unsubscribeFn()
      unsubscribeFn = null
      isSubscribed = false
    }
  }

  async function checkForUpdates(): Promise<boolean> {
    if (typeof window === 'undefined' || !window.api?.updater) return false
    try {
      status.value = 'checking'
      return await window.api.updater.checkForUpdates()
    } catch (err) {
      console.warn('[useUpdater] Error comprobando actualizaciones:', err)
      return false
    }
  }

  async function applyUpdate(): Promise<boolean> {
    if (typeof window === 'undefined' || !window.api?.updater) return false
    try {
      // Forzar guardado del capítulo abierto en el editor antes de reiniciar
      if (folioStore.activeFolioId) {
        try {
          await folioStore.saveCurrentFolio()
        } catch (saveErr) {
          console.warn('[useUpdater] Fallo al guardar capítulo previo a actualización:', saveErr)
        }
      }

      return await window.api.updater.applyUpdate()
    } catch (err) {
      console.error('[useUpdater] Error aplicando actualización:', err)
      return false
    }
  }

  const isDownloading = computed(() => status.value === 'downloading' || status.value === 'progress')
  const isReady = computed(() => status.value === 'ready')
  const isAvailableMac = computed(() => status.value === 'available-mac')

  // Visibilidad: solo se muestra durante descarga, listo en Windows o disponible en macOS
  const isVisible = computed(() => isDownloading.value || isReady.value || isAvailableMac.value)

  return {
    status,
    version,
    releaseUrl,
    percent,
    bytesPerSecond,
    transferred,
    total,
    errorMessage,
    isDownloading,
    isReady,
    isAvailableMac,
    isVisible,
    init,
    destroy,
    checkForUpdates,
    applyUpdate
  }
}

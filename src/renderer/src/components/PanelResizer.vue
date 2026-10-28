<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'

const props = withDefaults(
  defineProps<{
    side: 'left' | 'right'
    currentWidth: number
    minWidth?: number
    maxWidth?: number
    label?: string
  }>(),
  {
    minWidth: 200,
    maxWidth: 500,
    label: 'Ajustar ancho del panel'
  }
)

const emit = defineEmits<{
  (e: 'update:width', width: number): void
  (e: 'dragStart'): void
  (e: 'dragEnd'): void
  (e: 'reset'): void
}>()

const isDragging = ref(false)
let startX = 0
let startWidth = 0

function onPointerDown(e: PointerEvent): void {
  // Solo responder al botón principal (izquierdo) del ratón
  if (e.button !== 0) return

  e.preventDefault()
  isDragging.value = true
  startX = e.clientX
  startWidth = props.currentWidth

  try {
    const el = e.currentTarget as HTMLElement | null
    if (el?.setPointerCapture) {
      el.setPointerCapture(e.pointerId)
    }
  } catch {
    // Si setPointerCapture no es soportado, los listeners de window cubren el fallback
  }

  // Prevenir selección de texto y mantener cursor consistente
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'

  window.addEventListener('pointermove', onGlobalPointerMove)
  window.addEventListener('pointerup', onGlobalPointerUp)
  window.addEventListener('pointercancel', onGlobalPointerUp)

  emit('dragStart')
}

function onGlobalPointerMove(e: PointerEvent): void {
  if (!isDragging.value) return

  const deltaX = e.clientX - startX
  // Para el panel izquierdo: mover a la derecha aumenta el ancho
  // Para el panel derecho: mover a la izquierda aumenta el ancho
  const rawWidth = props.side === 'left' ? startWidth + deltaX : startWidth - deltaX
  const clampedWidth = Math.max(props.minWidth, Math.min(props.maxWidth, Math.round(rawWidth)))

  emit('update:width', clampedWidth)
}

function onGlobalPointerUp(e?: PointerEvent): void {
  if (!isDragging.value) return

  isDragging.value = false

  if (e) {
    try {
      const el = e.currentTarget as HTMLElement | null
      if (el?.releasePointerCapture) {
        el.releasePointerCapture(e.pointerId)
      }
    } catch {
      // Ignorar fallback
    }
  }

  document.body.style.cursor = ''
  document.body.style.userSelect = ''

  window.removeEventListener('pointermove', onGlobalPointerMove)
  window.removeEventListener('pointerup', onGlobalPointerUp)
  window.removeEventListener('pointercancel', onGlobalPointerUp)

  emit('dragEnd')
}

function onDoubleClick(): void {
  emit('reset')
}

function onKeyDown(e: KeyboardEvent): void {
  const STEP = 16
  if (e.key === 'ArrowLeft') {
    e.preventDefault()
    const delta = props.side === 'left' ? -STEP : STEP
    emit(
      'update:width',
      Math.max(props.minWidth, Math.min(props.maxWidth, props.currentWidth + delta))
    )
  } else if (e.key === 'ArrowRight') {
    e.preventDefault()
    const delta = props.side === 'left' ? STEP : -STEP
    emit(
      'update:width',
      Math.max(props.minWidth, Math.min(props.maxWidth, props.currentWidth + delta))
    )
  } else if (e.key === 'Home') {
    e.preventDefault()
    emit('update:width', props.minWidth)
  } else if (e.key === 'End') {
    e.preventDefault()
    emit('update:width', props.maxWidth)
  } else if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    emit('reset')
  }
}

onBeforeUnmount(() => {
  if (isDragging.value) {
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    window.removeEventListener('pointermove', onGlobalPointerMove)
    window.removeEventListener('pointerup', onGlobalPointerUp)
    window.removeEventListener('pointercancel', onGlobalPointerUp)
  }
})
</script>

<template>
  <div
    role="separator"
    aria-orientation="vertical"
    :aria-valuenow="currentWidth"
    :aria-valuemin="minWidth"
    :aria-valuemax="maxWidth"
    :aria-label="label"
    tabindex="0"
    class="relative flex items-center justify-center w-3 md:w-3.5 h-full shrink-0 cursor-col-resize select-none touch-none group focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)] z-20"
    :class="{ 'is-resizing': isDragging }"
    title="Arrastra de izquierda a derecha para ajustar el tamaño (Doble clic para restablecer)"
    @pointerdown="onPointerDown"
    @dblclick="onDoubleClick"
    @keydown="onKeyDown"
  >
    <!-- Área táctil expandida (hitbox) para un agarre suave y sin esfuerzo -->
    <div
      class="absolute inset-y-0 -left-1.5 -right-1.5 cursor-col-resize pointer-events-none"
    ></div>

    <!-- Indicador visual neumórfico: píldora táctil editorial con micro-ranuras / puntos -->
    <div
      class="relative z-10 w-1.5 h-10 rounded-full neu-well-sm flex flex-col items-center justify-center gap-1 transition-all duration-200 group-hover:h-14 group-hover:border group-hover:border-[var(--accent)]/50 group-hover:bg-[var(--accent)]/10"
      :class="{
        '!h-20 !border !border-[var(--accent)] !bg-[var(--accent)]/20 shadow-md shadow-[var(--accent)]/20 scale-105':
          isDragging
      }"
    >
      <div
        class="w-0.5 h-0.5 rounded-full bg-[var(--text-muted)] group-hover:bg-[var(--accent)] transition-colors duration-150"
        :class="{ '!bg-[var(--accent)]': isDragging }"
      ></div>
      <div
        class="w-0.5 h-0.5 rounded-full bg-[var(--text-muted)] group-hover:bg-[var(--accent)] transition-colors duration-150"
        :class="{ '!bg-[var(--accent)]': isDragging }"
      ></div>
      <div
        class="w-0.5 h-0.5 rounded-full bg-[var(--text-muted)] group-hover:bg-[var(--accent)] transition-colors duration-150"
        :class="{ '!bg-[var(--accent)]': isDragging }"
      ></div>
    </div>
  </div>
</template>

<style scoped>
.is-resizing {
  cursor: col-resize !important;
}
</style>

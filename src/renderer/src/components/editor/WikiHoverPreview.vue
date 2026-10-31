<script setup lang="ts">
import { ref, nextTick, onMounted, onBeforeUnmount, type Component } from 'vue'
import { computePosition, flip, shift, offset, arrow } from '@floating-ui/dom'
import {
  User,
  MapPin,
  Box,
  Lightbulb,
  Sparkles,
  ExternalLink,
  BookOpen
} from 'lucide-vue-next'
import type { LoreItem } from '@shared/types'

export interface WikiHoverPayload {
  entity: LoreItem
  targetEl: HTMLElement
}

const props = defineProps<{
  containerEl?: HTMLElement | null
}>()

const emit = defineEmits<{
  (e: 'navigate', entity: LoreItem): void
}>()

const isVisible = ref(false)
const currentEntity = ref<LoreItem | null>(null)
const floatingEl = ref<HTMLElement | null>(null)
const arrowEl = ref<HTMLElement | null>(null)
let currentAnchorEl: HTMLElement | null = null

let showTimeout: ReturnType<typeof setTimeout> | null = null
let hideTimeout: ReturnType<typeof setTimeout> | null = null

function getCategoryIcon(category: string): Component {
  const c = (category || '').toLowerCase()
  if (c.includes('personaje')) return User
  if (c.includes('lugar')) return MapPin
  if (c.includes('objeto')) return Box
  if (c.includes('idea') || c.includes('pensamiento')) return Lightbulb
  return Sparkles
}

function clearTimers(): void {
  if (showTimeout) {
    clearTimeout(showTimeout)
    showTimeout = null
  }
  if (hideTimeout) {
    clearTimeout(hideTimeout)
    hideTimeout = null
  }
}

async function updatePosition(): Promise<void> {
  if (!currentAnchorEl || !floatingEl.value) return

  const arrowElement = arrowEl.value

  const { x, y, placement, middlewareData } = await computePosition(
    currentAnchorEl,
    floatingEl.value,
    {
      placement: 'top',
      middleware: [
        offset(8),
        flip({ fallbackPlacements: ['bottom', 'top-start', 'bottom-start'] }),
        shift({ padding: 12 }),
        arrowElement ? arrow({ element: arrowElement }) : undefined
      ].filter(Boolean) as any
    }
  )

  if (floatingEl.value) {
    Object.assign(floatingEl.value.style, {
      left: `${x}px`,
      top: `${y}px`
    })
  }

  if (arrowElement && middlewareData.arrow) {
    const { x: arrowX, y: arrowY } = middlewareData.arrow
    const staticSide = {
      top: 'bottom',
      right: 'left',
      bottom: 'top',
      left: 'right'
    }[placement.split('-')[0]] || 'bottom'

    Object.assign(arrowElement.style, {
      left: arrowX != null ? `${arrowX}px` : '',
      top: arrowY != null ? `${arrowY}px` : '',
      right: '',
      bottom: '',
      [staticSide]: '-4px'
    })
  }
}

function show(payload: WikiHoverPayload, delayMs = 1500): void {
  // Si ya estamos mostrando esta misma entidad en el mismo elemento, no reiniciar
  if (isVisible.value && currentAnchorEl === payload.targetEl && currentEntity.value?.id === payload.entity.id) {
    if (hideTimeout) {
      clearTimeout(hideTimeout)
      hideTimeout = null
    }
    return
  }

  clearTimers()
  currentAnchorEl = payload.targetEl

  showTimeout = setTimeout(() => {
    currentEntity.value = payload.entity
    isVisible.value = true
    nextTick(() => {
      updatePosition()
    })
  }, delayMs)
}

function scheduleHide(delayMs = 200): void {
  if (showTimeout) {
    clearTimeout(showTimeout)
    showTimeout = null
  }
  if (hideTimeout) {
    clearTimeout(hideTimeout)
  }
  hideTimeout = setTimeout(() => {
    isVisible.value = false
    currentAnchorEl = null
  }, delayMs)
}

function onPopoverMouseEnter(): void {
  clearTimers()
}

function onPopoverMouseLeave(): void {
  scheduleHide(150)
}

function handleNavigate(): void {
  if (!currentEntity.value) return
  const ent = currentEntity.value
  isVisible.value = false
  emit('navigate', ent)
}

onMounted(() => {
  window.addEventListener('resize', updatePosition)
  window.addEventListener('scroll', updatePosition, true)
})

onBeforeUnmount(() => {
  clearTimers()
  window.removeEventListener('resize', updatePosition)
  window.removeEventListener('scroll', updatePosition, true)
})

defineExpose({
  show,
  scheduleHide,
  hideImmediately: () => {
    clearTimers()
    isVisible.value = false
    currentAnchorEl = null
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="isVisible && currentEntity"
        ref="floatingEl"
        class="fixed z-[120] w-72 max-w-[85vw] neu-surface rounded-2xl border border-[var(--groove-dark)]/70 shadow-2xl overflow-hidden p-3 select-none backdrop-blur-md bg-[var(--bg-surface)] text-[var(--text-primary)]"
        role="tooltip"
        @mouseenter="onPopoverMouseEnter"
        @mouseleave="onPopoverMouseLeave"
      >
        <!-- Flecha del popover -->
        <div
          ref="arrowEl"
          class="absolute w-2 h-2 rotate-45 bg-[var(--bg-surface)] border border-[var(--groove-dark)]/50 pointer-events-none"
        ></div>

        <!-- Encabezado de la entidad -->
        <div class="flex items-start justify-between gap-2.5 pb-2 border-b border-[var(--groove-dark)]/30">
          <div class="flex items-center gap-2 min-w-0">
            <div
              class="w-7 h-7 rounded-xl neu-well-sm flex items-center justify-center text-[var(--accent)] shrink-0"
            >
              <component :is="getCategoryIcon(currentEntity.category)" :size="14" />
            </div>

            <div class="min-w-0">
              <h4 class="font-editorial font-bold text-sm text-[var(--text-primary)] truncate leading-tight">
                {{ currentEntity.name }}
              </h4>
              <span
                class="inline-block text-[9px] font-mono uppercase tracking-wider text-[var(--accent)] font-semibold neu-well-sm px-1.5 py-0.2 rounded mt-0.5"
              >
                {{ currentEntity.category }}
              </span>
            </div>
          </div>

          <button
            type="button"
            class="neu-btn px-2 py-1 rounded-lg text-[10px] font-mono text-[var(--text-secondary)] hover:!text-[var(--accent)] flex items-center gap-1 cursor-pointer transition-all shrink-0 active:scale-95"
            title="Abrir ficha completa en la Wiki lateral"
            @click="handleNavigate"
          >
            <span>Ver ficha</span>
            <ExternalLink :size="10" />
          </button>
        </div>

        <!-- Resumen / Extracto -->
        <div class="pt-2.5 pb-1">
          <p
            v-if="currentEntity.summary"
            class="text-xs text-[var(--text-secondary)] font-editorial italic leading-relaxed line-clamp-3"
          >
            {{ currentEntity.summary }}
          </p>
          <p
            v-else-if="currentEntity.content"
            class="text-xs text-[var(--text-muted)] font-editorial leading-relaxed line-clamp-3"
          >
            {{ currentEntity.content.replace(/<[^>]*>/g, ' ').slice(0, 160) }}…
          </p>
          <p v-else class="text-xs text-[var(--text-muted)] italic">
            Ficha de la Wiki sin resumen disponible.
          </p>
        </div>

        <!-- Atributos rápidos si existen -->
        <div
          v-if="currentEntity.attributes && Object.keys(currentEntity.attributes).length > 0"
          class="flex flex-wrap gap-1 pt-1.5 border-t border-[var(--groove-dark)]/20 mt-1"
        >
          <span
            v-for="(val, key) in Object.entries(currentEntity.attributes).slice(0, 3)"
            :key="key"
            class="text-[9px] font-mono text-[var(--text-muted)] neu-well-sm px-1.5 py-0.5 rounded truncate max-w-[120px]"
          >
            <strong class="text-[var(--text-secondary)]">{{ val[0] }}:</strong> {{ val[1] }}
          </span>
        </div>

        <!-- Pie sutil con pista de atajo de teclado -->
        <div class="pt-2 mt-2 border-t border-[var(--groove-dark)]/30 flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)]">
          <span class="flex items-center gap-1">
            <BookOpen :size="10" class="opacity-70" />
            <span>Wiki de Lore</span>
          </span>
          <span class="neu-well-sm px-1 py-0.2 rounded text-[9px]">
            <strong class="text-[var(--accent)]">Ctrl+Clic</strong>: Abrir
          </span>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>


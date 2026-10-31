<script setup lang="ts">
import { ref, computed, nextTick, onBeforeUnmount } from 'vue'
import { computePosition, flip, shift, offset, arrow } from '@floating-ui/dom'
import { onClickOutside } from '@vueuse/core'
import type { Editor } from '@tiptap/vue-3'
import { Radio, Eye, X, Ban, Sparkles, Check } from 'lucide-vue-next'
import type { EchoCluster, EchoOccurrence } from '../../composables/useEchoDetector'
import type { LanguagePack } from '../../nlp/types'
import { useEchoRadar } from '../../composables/useEchoRadar'

export interface EchoPopoverOpenPayload {
  occurrence: EchoOccurrence
  cluster: EchoCluster
  targetEl: HTMLElement
  pack: LanguagePack
  windowSizeWords: number
}

const props = defineProps<{
  editor: Editor | null | undefined
}>()

const emit = defineEmits<{
  (e: 'ignore', stem: string): void
  (e: 'replaced', payload: { from: number; to: number; synonym: string }): void
}>()

const { ignoreStem } = useEchoRadar()

const isVisible = ref(false)
const floatingEl = ref<HTMLElement | null>(null)
const arrowEl = ref<HTMLElement | null>(null)
let currentAnchorEl: HTMLElement | null = null
const currentPayload = ref<EchoPopoverOpenPayload | null>(null)

let isPulsing = false
let pulseTimeout: ReturnType<typeof setTimeout> | null = null

onClickOutside(floatingEl, (event) => {
  // Ignorar si el clic fue en un elemento de eco para permitir cambiar de popover directamente
  const target = event.target as HTMLElement | null
  if (target && target.closest('.echo-highlight')) return
  close()
})

const inflectedSynonyms = computed<string[]>(() => {
  if (!currentPayload.value) return []
  const { cluster, occurrence, pack } = currentPayload.value
  const list = pack.synonyms[cluster.stem] || []
  return list.map((syn) => pack.inflectReplacement(occurrence.word, syn))
})

async function open(payload: EchoPopoverOpenPayload): Promise<void> {
  currentPayload.value = payload
  currentAnchorEl = payload.targetEl
  isVisible.value = true

  await nextTick()
  await updatePosition()
}

function close(): void {
  stopPulse()
  isVisible.value = false
  currentAnchorEl = null
  currentPayload.value = null
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

function startPulse(): void {
  if (!currentPayload.value) return
  isPulsing = true
  const stem = currentPayload.value.cluster.stem
  const matchingEls = document.querySelectorAll(`.echo-highlight[data-echo-stem="${stem}"]`)
  matchingEls.forEach((el) => {
    el.classList.add('echo-pulse-active')
  })
}

function stopPulse(): void {
  isPulsing = false
  if (pulseTimeout) {
    clearTimeout(pulseTimeout)
    pulseTimeout = null
  }
  const pulseEls = document.querySelectorAll('.echo-highlight.echo-pulse-active')
  pulseEls.forEach((el) => {
    el.classList.remove('echo-pulse-active')
  })
}

function togglePulse(): void {
  if (isPulsing) {
    stopPulse()
  } else {
    startPulse()
    pulseTimeout = setTimeout(() => {
      stopPulse()
    }, 2500)
  }
}

function handleReplaceSynonym(synonym: string): void {
  if (!currentPayload.value || !props.editor) return
  const { occurrence } = currentPayload.value

  props.editor
    .chain()
    .focus()
    .insertContentAt({ from: occurrence.from, to: occurrence.to }, synonym)
    .run()

  emit('replaced', {
    from: occurrence.from,
    to: occurrence.to,
    synonym
  })

  close()
}

function handleIgnoreWord(): void {
  if (!currentPayload.value) return
  const stem = currentPayload.value.cluster.stem

  // Actualizar estado reactivo y comando TipTap
  ignoreStem(stem)
  if (props.editor) {
    props.editor.commands.ignoreEchoStem(stem)
  }

  emit('ignore', stem)
  close()
}

onBeforeUnmount(() => {
  stopPulse()
})

defineExpose({
  open,
  close,
  isVisible
})
</script>

<template>
  <Transition
    enter-active-class="transition duration-150 ease-out"
    enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition duration-100 ease-in"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-95"
  >
    <div
      v-if="isVisible && currentPayload"
      ref="floatingEl"
      class="fixed z-50 w-72 md:w-80 neu-surface border border-[var(--groove-dark)]/50 rounded-xl shadow-2xl p-3 select-none text-[var(--text-primary)]"
      style="top: 0; left: 0"
    >
      <!-- Flecha con estilo Neumórfico -->
      <div
        ref="arrowEl"
        class="absolute w-2 h-2 bg-[var(--bg-base)] border border-[var(--groove-dark)]/40 rotate-45 pointer-events-none"
      ></div>

      <!-- Cabecera de Diagnóstico -->
      <div class="flex items-start justify-between gap-2 pb-2 border-b border-[var(--groove-dark)]/30">
        <div class="flex items-center gap-2 min-w-0">
          <div class="w-6 h-6 rounded-md neu-well flex items-center justify-center text-[var(--accent)] shrink-0">
            <Radio :size="13" class="animate-pulse" />
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-1.5">
              <span class="font-bold text-xs truncate max-w-[140px] text-[var(--text-primary)]">
                «{{ currentPayload.occurrence.word }}»
              </span>
              <span class="text-[10px] font-mono px-1.5 py-0.2 rounded-full neu-well text-[var(--accent)] font-semibold shrink-0">
                ×{{ currentPayload.cluster.count }}
              </span>
            </div>
            <p class="text-[10px] text-[var(--text-muted)] truncate">
              Repetida {{ currentPayload.cluster.count }} veces en ~{{ currentPayload.windowSizeWords }} palabras
            </p>
          </div>
        </div>

        <button
          type="button"
          class="neu-btn w-5 h-5 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer shrink-0"
          title="Cerrar"
          @click="close"
        >
          <X :size="11" />
        </button>
      </div>

      <!-- Acción: Localizar ecos -->
      <div class="py-2 border-b border-[var(--groove-dark)]/30">
        <button
          type="button"
          class="w-full neu-btn px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between text-[var(--text-secondary)] hover:text-[var(--accent)] transition-all cursor-pointer group"
          @mouseenter="startPulse"
          @mouseleave="stopPulse"
          @click="togglePulse"
        >
          <span class="flex items-center gap-1.5 text-[11px] font-medium">
            <Eye :size="12" class="text-[var(--accent)] group-hover:scale-110 transition-transform" />
            Localizar ecos en el texto
          </span>
          <span class="text-[10px] font-mono text-[var(--text-muted)] group-hover:text-[var(--accent)]">
            {{ currentPayload.cluster.count }} apariciones
          </span>
        </button>
      </div>

      <!-- Banco de Sinónimos (Reemplazo en 1 Clic) -->
      <div class="py-2.5">
        <div class="flex items-center justify-between gap-1 mb-1.5">
          <span class="text-[10px] font-semibold tracking-wider uppercase text-[var(--text-muted)] flex items-center gap-1">
            <Sparkles :size="10" class="text-[var(--accent)]" />
            Sinónimos Literarios
          </span>
          <span class="text-[9px] font-mono text-[var(--text-muted)]/70">
            1 clic para sustituir
          </span>
        </div>

        <div v-if="inflectedSynonyms.length > 0" class="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
          <button
            v-for="(syn, idx) in inflectedSynonyms"
            :key="idx"
            type="button"
            class="neu-btn px-2 py-1 rounded-md text-xs font-editorial text-[var(--text-primary)] hover:!text-[var(--accent)] hover:border-[var(--accent)]/40 transition-all cursor-pointer text-left flex items-center gap-1 group"
            :title="`Sustituir «${currentPayload.occurrence.word}» por «${syn}»`"
            @click="handleReplaceSynonym(syn)"
          >
            <span>{{ syn }}</span>
            <Check :size="10" class="opacity-0 group-hover:opacity-100 text-[var(--accent)] transition-opacity shrink-0" />
          </button>
        </div>

        <div
          v-else
          class="py-2 px-2.5 neu-well rounded-lg text-center text-[10px] text-[var(--text-muted)] italic"
        >
          Sin sugerencias directas en el diccionario local
        </div>
      </div>

      <!-- Pie: Ignorar palabra -->
      <div class="pt-2 border-t border-[var(--groove-dark)]/30 flex items-center justify-between">
        <button
          type="button"
          class="neu-btn px-2 py-1 rounded-md text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1 transition-all cursor-pointer"
          title="No volver a marcar repeticiones de esta palabra en esta sesión"
          @click="handleIgnoreWord"
        >
          <Ban :size="11" />
          <span>Ignorar palabra</span>
        </button>

        <span class="text-[9px] font-mono text-[var(--text-muted)]/60">
          Esc / Clic fuera
        </span>
      </div>
    </div>
  </Transition>
</template>

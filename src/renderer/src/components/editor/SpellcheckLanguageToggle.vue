<script setup lang="ts">
import { ref, watch, nextTick, onBeforeUnmount } from 'vue'
import { computePosition, flip, shift, offset, autoUpdate } from '@floating-ui/dom'
import { Check, Languages, ChevronDown } from 'lucide-vue-next'
import { onClickOutside } from '@vueuse/core'

const props = defineProps<{
  currentLang: 'auto' | 'es' | 'en'
  detectedLang?: 'es' | 'en'
}>()

const emit = defineEmits<{
  (e: 'update:lang', lang: 'auto' | 'es' | 'en'): void
}>()

const isOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)
const popoverRef = ref<HTMLElement | null>(null)

let cleanupFloating: (() => void) | null = null

watch(isOpen, async (open) => {
  if (cleanupFloating) {
    cleanupFloating()
    cleanupFloating = null
  }
  if (!open) return

  await nextTick()
  if (!dropdownRef.value || !popoverRef.value) return

  cleanupFloating = autoUpdate(dropdownRef.value, popoverRef.value, () => {
    if (!dropdownRef.value || !popoverRef.value) return
    computePosition(dropdownRef.value, popoverRef.value, {
      placement: 'bottom-end',
      strategy: 'fixed',
      middleware: [
        offset(6),
        flip({ fallbackPlacements: ['top-end', 'bottom-start', 'top-start'] }),
        shift({ padding: 12 })
      ]
    }).then(({ x, y }) => {
      if (popoverRef.value) {
        popoverRef.value.style.left = `${Math.round(x)}px`
        popoverRef.value.style.top = `${Math.round(y)}px`
      }
    })
  })
})

onBeforeUnmount(() => {
  if (cleanupFloating) {
    cleanupFloating()
    cleanupFloating = null
  }
})

onClickOutside(popoverRef, (event) => {
  if (dropdownRef.value && dropdownRef.value.contains(event.target as Node)) {
    return
  }
  isOpen.value = false
})

function select(lang: 'auto' | 'es' | 'en'): void {
  emit('update:lang', lang)
  isOpen.value = false
}
</script>

<template>
  <div ref="dropdownRef" class="relative inline-flex items-center shrink-0">
    <button
      type="button"
      class="neu-btn h-7 px-2 flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer select-none"
      :class="{ 'neu-well !text-[var(--accent)] font-semibold': isOpen }"
      :title="
        currentLang === 'auto'
          ? `Corrector ortográfico: Detección automática (Detectado: ${detectedLang === 'en' ? 'Inglés' : 'Español'})`
          : `Corrector ortográfico fijado en: ${currentLang === 'en' ? 'English (en-US)' : 'Español (es-ES)'}`
      "
      @mousedown.prevent
      @click="isOpen = !isOpen"
    >
      <Languages :size="13" class="text-[var(--accent)]" />
      <span class="font-mono text-[11px] font-semibold uppercase">
        <template v-if="currentLang === 'auto'">
          Auto ({{ (detectedLang || 'es').toUpperCase() }})
        </template>
        <template v-else>
          {{ currentLang }}
        </template>
      </span>
      <ChevronDown
        :size="10"
        class="text-[var(--text-muted)] transition-transform duration-150"
        :class="{ 'rotate-180': isOpen }"
      />
    </button>

    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-100 ease-out"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition duration-75 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-if="isOpen"
          ref="popoverRef"
          class="fixed z-[9999] neu-surface bg-[var(--bg-surface)] backdrop-blur-md p-1.5 min-w-[170px] shadow-2xl border border-[var(--groove-dark)]/60 rounded-xl space-y-0.5 text-xs text-[var(--text-primary)] select-none"
          @click.stop
        >
          <button
            type="button"
            class="w-full px-2.5 py-1.5 text-left rounded-lg flex items-center justify-between hover:bg-[var(--bg-base)] transition-colors cursor-pointer"
            :class="{ 'text-[var(--accent)] font-bold neu-well-sm': currentLang === 'auto' }"
            @mousedown.prevent
            @click.stop="select('auto')"
          >
            <div class="flex items-center gap-1.5">
              <span>Auto (Detectar)</span>
              <span
                class="text-[9px] font-mono px-1 py-0.2 rounded neu-well-sm text-[var(--accent)] uppercase font-semibold"
              >
                {{ detectedLang || 'es' }}
              </span>
            </div>
            <Check v-if="currentLang === 'auto'" :size="11" />
          </button>
          <button
            type="button"
            class="w-full px-2.5 py-1.5 text-left rounded-lg flex items-center justify-between hover:bg-[var(--bg-base)] transition-colors cursor-pointer"
            :class="{ 'text-[var(--accent)] font-bold neu-well-sm': currentLang === 'es' }"
            @mousedown.prevent
            @click.stop="select('es')"
          >
            <span>Español (ES)</span>
            <Check v-if="currentLang === 'es'" :size="11" />
          </button>
          <button
            type="button"
            class="w-full px-2.5 py-1.5 text-left rounded-lg flex items-center justify-between hover:bg-[var(--bg-base)] transition-colors cursor-pointer"
            :class="{ 'text-[var(--accent)] font-bold neu-well-sm': currentLang === 'en' }"
            @mousedown.prevent
            @click.stop="select('en')"
          >
            <span>English (EN)</span>
            <Check v-if="currentLang === 'en'" :size="11" />
          </button>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

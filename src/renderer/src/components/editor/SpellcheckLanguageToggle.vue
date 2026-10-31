<script setup lang="ts">
import { ref } from 'vue'
import { Check, Languages, ChevronDown } from 'lucide-vue-next'
import { onClickOutside } from '@vueuse/core'

const props = defineProps<{
  currentLang: 'auto' | 'es' | 'en'
}>()

const emit = defineEmits<{
  (e: 'update:lang', lang: 'auto' | 'es' | 'en'): void
}>()

const isOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

onClickOutside(dropdownRef, () => {
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
      title="Idioma del corrector ortográfico (Español / English)"
      @mousedown.prevent
      @click="isOpen = !isOpen"
    >
      <Languages :size="13" class="text-[var(--accent)]" />
      <span class="font-mono text-[11px] font-semibold uppercase">
        {{ currentLang === 'auto' ? 'Auto' : currentLang }}
      </span>
      <ChevronDown
        :size="10"
        class="text-[var(--text-muted)] transition-transform duration-150"
        :class="{ 'rotate-180': isOpen }"
      />
    </button>

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
        class="absolute right-0 top-full mt-1.5 z-50 neu-surface p-1.5 min-w-[140px] shadow-xl border border-[var(--groove-dark)]/50 rounded-lg space-y-0.5 text-xs text-[var(--text-primary)] select-none"
      >
        <button
          type="button"
          class="w-full px-2 py-1 text-left rounded-md flex items-center justify-between hover:bg-[var(--bg-base)] cursor-pointer"
          :class="{ 'text-[var(--accent)] font-bold neu-well-sm': currentLang === 'auto' }"
          @click="select('auto')"
        >
          <span>Auto (Detectar)</span>
          <Check v-if="currentLang === 'auto'" :size="11" />
        </button>
        <button
          type="button"
          class="w-full px-2 py-1 text-left rounded-md flex items-center justify-between hover:bg-[var(--bg-base)] cursor-pointer"
          :class="{ 'text-[var(--accent)] font-bold neu-well-sm': currentLang === 'es' }"
          @click="select('es')"
        >
          <span>Español (ES)</span>
          <Check v-if="currentLang === 'es'" :size="11" />
        </button>
        <button
          type="button"
          class="w-full px-2 py-1 text-left rounded-md flex items-center justify-between hover:bg-[var(--bg-base)] cursor-pointer"
          :class="{ 'text-[var(--accent)] font-bold neu-well-sm': currentLang === 'en' }"
          @click="select('en')"
        >
          <span>English (EN)</span>
          <Check v-if="currentLang === 'en'" :size="11" />
        </button>
      </div>
    </Transition>
  </div>
</template>

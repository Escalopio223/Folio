<script setup lang="ts">
import { ref, computed } from 'vue'
import { onClickOutside } from '@vueuse/core'
import {
  SlidersHorizontal,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Minus,
  RotateCcw,
  Globe,
  BookOpen,
  Check
} from 'lucide-vue-next'
import type { ChapterTitleFormat, ChapterTitleAlignment } from '@shared/types'
import { DEFAULT_CHAPTER_TITLE_FORMAT } from '../../stores/uiStore'
import HybridFontSizeSelect from './HybridFontSizeSelect.vue'

const props = defineProps<{
  globalFormat: ChapterTitleFormat
  chapterOverride: ChapterTitleFormat | null
}>()

const emit = defineEmits<{
  (e: 'update:globalFormat', format: ChapterTitleFormat): void
  (e: 'update:chapterOverride', format: ChapterTitleFormat | null): void
}>()

const isOpen = ref(false)
const popoverRef = ref<HTMLElement | null>(null)

onClickOutside(popoverRef, () => {
  isOpen.value = false
})

// Si el capítulo tiene un override activo, editamos el capítulo; si no, editamos el global del libro
const scopeMode = computed<'global' | 'chapter'>(() =>
  props.chapterOverride !== null ? 'chapter' : 'global'
)

const activeFormat = computed<ChapterTitleFormat>(() =>
  props.chapterOverride ?? props.globalFormat
)

const titleFontOptions = [
  {
    label: 'Editorial (Newsreader / Playfair)',
    value: "'Newsreader', 'Playfair Display', Georgia, serif"
  },
  {
    label: 'Literaria Clásica (EB Garamond)',
    value: "'EB Garamond', Garamond, Georgia, serif"
  },
  {
    label: 'Clásica de Imprenta (Baskerville / Georgia)',
    value: "Baskerville, 'Libre Baskerville', Georgia, serif"
  },
  {
    label: 'Moderna Minimalista (Inter Sans)',
    value: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
  },
  {
    label: 'Mecanográfica (Courier Prime)',
    value: "'Courier Prime', 'Courier New', monospace"
  }
]

const titleColorSwatches = [
  { label: 'Tinta del Tema (Automático)', value: '' },
  { label: 'Negro Carbón Editorial', value: '#1C1917' },
  { label: 'Sepia Profundo', value: '#3E2723' },
  { label: 'Terracota Folio', value: '#C85A32' },
  { label: 'Borgoña Clásico', value: '#7F1D1D' },
  { label: 'Azul Medianoche', value: '#1E3A8A' },
  { label: 'Verde Bosque', value: '#14532D' },
  { label: 'Gris Piedra', value: '#57534E' }
]

function setScope(target: 'global' | 'chapter'): void {
  if (target === 'chapter' && props.chapterOverride === null) {
    emit('update:chapterOverride', { ...props.globalFormat })
  } else if (target === 'global' && props.chapterOverride !== null) {
    emit('update:chapterOverride', null)
  }
}

function updateField<K extends keyof ChapterTitleFormat>(
  key: K,
  value: ChapterTitleFormat[K]
): void {
  const next: ChapterTitleFormat = {
    ...activeFormat.value,
    [key]: value
  }
  if (scopeMode.value === 'chapter') {
    emit('update:chapterOverride', next)
  } else {
    emit('update:globalFormat', next)
  }
}

function setAlignment(alignment: ChapterTitleAlignment): void {
  updateField('alignment', alignment)
}

function toggleDivider(): void {
  updateField('showDivider', !activeFormat.value.showDivider)
}

function handleFontSizeChange(numericSize: number): void {
  updateField('fontSize', numericSize)
}

function handleHexColorInput(e: Event): void {
  const val = (e.target as HTMLInputElement).value.trim()
  if (!val || /^#[0-9A-Fa-f]{3,6}$/.test(val)) {
    updateField('color', val)
  }
}

function resetCurrentFormat(): void {
  if (scopeMode.value === 'chapter') {
    emit('update:chapterOverride', null)
  } else {
    emit('update:globalFormat', { ...DEFAULT_CHAPTER_TITLE_FORMAT })
  }
}
</script>

<template>
  <div ref="popoverRef" class="relative inline-flex items-center">
    <button
      type="button"
      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg neu-btn text-[11px] font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
      :class="{
        'neu-well !text-[var(--accent)] font-semibold': isOpen || chapterOverride !== null
      }"
      title="Formato y maquetación del título del capítulo (Sincronizado con PDF)"
      @click="isOpen = !isOpen"
    >
      <SlidersHorizontal :size="11" class="text-[var(--accent)] shrink-0" />
      <span>Diseño de título</span>
      <span
        v-if="chapterOverride !== null"
        class="w-1.5 h-1.5 rounded-full bg-[var(--accent)]"
        title="Este capítulo usa un formato personalizado"
      ></span>
    </button>

    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 translate-y-1 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 translate-y-1 scale-95"
    >
      <div
        v-if="isOpen"
        class="absolute left-0 top-full mt-2 z-50 w-80 neu-surface p-3.5 rounded-2xl border border-[var(--groove-dark)]/60 shadow-2xl space-y-3 text-xs select-none"
      >
        <!-- Encabezado y Selector de Ámbito (Libro Global vs. Capítulo Actual) -->
        <div class="flex items-center justify-between gap-2">
          <span class="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
            Formato de Encabezado & PDF
          </span>
          <button
            type="button"
            class="text-[10px] font-mono text-[var(--text-muted)] hover:text-[var(--accent)] inline-flex items-center gap-1 cursor-pointer transition-colors"
            title="Restablecer valores por defecto"
            @click="resetCurrentFormat"
          >
            <RotateCcw :size="10" />
            <span>Restablecer</span>
          </button>
        </div>

        <!-- Conmutador de Ámbito: Todo el libro vs. Este capítulo -->
        <div class="grid grid-cols-2 gap-1 p-1 rounded-xl neu-well-sm">
          <button
            type="button"
            class="py-1 px-2 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            :class="
              scopeMode === 'global'
                ? 'neu-btn !text-[var(--accent)] font-semibold shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            "
            @click="setScope('global')"
          >
            <Globe :size="11" />
            <span>Todo el libro</span>
          </button>
          <button
            type="button"
            class="py-1 px-2 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            :class="
              scopeMode === 'chapter'
                ? 'neu-btn !text-[var(--accent)] font-semibold shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            "
            @click="setScope('chapter')"
          >
            <BookOpen :size="11" />
            <span>Este capítulo</span>
          </button>
        </div>

        <div class="neu-groove-h"></div>

        <!-- 1. Alineación y Tamaño Híbrido -->
        <div class="flex items-center justify-between gap-3">
          <div class="space-y-1">
            <label class="block text-[10px] font-mono text-[var(--text-muted)] uppercase">
              Alineación
            </label>
            <div class="inline-flex items-center gap-1 p-0.5 rounded-xl neu-well-sm">
              <button
                type="button"
                class="w-7 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer"
                :class="
                  activeFormat.alignment === 'left'
                    ? 'neu-btn !text-[var(--accent)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                "
                title="Alinear encabezado a la izquierda"
                @click="setAlignment('left')"
              >
                <AlignLeft :size="13" />
              </button>
              <button
                type="button"
                class="w-7 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer"
                :class="
                  activeFormat.alignment === 'center'
                    ? 'neu-btn !text-[var(--accent)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                "
                title="Centrar encabezado"
                @click="setAlignment('center')"
              >
                <AlignCenter :size="13" />
              </button>
              <button
                type="button"
                class="w-7 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer"
                :class="
                  activeFormat.alignment === 'right'
                    ? 'neu-btn !text-[var(--accent)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                "
                title="Alinear encabezado a la derecha"
                @click="setAlignment('right')"
              >
                <AlignRight :size="13" />
              </button>
            </div>
          </div>

          <div class="space-y-1">
            <label class="block text-[10px] font-mono text-[var(--text-muted)] uppercase">
              Tamaño (decimales)
            </label>
            <HybridFontSizeSelect
              :model-value="activeFormat.fontSize"
              unit="px"
              :min="12"
              :max="72"
              :presets="[18, 20, 22, 24, 26, 28, 30, 32, 36, 42, 48]"
              placeholder="32"
              title="Tamaño del título del capítulo (admite decimales ej. 28.5)"
              @update:model-value="handleFontSizeChange"
            />
          </div>
        </div>

        <!-- 2. Fuente del Título -->
        <div class="space-y-1">
          <label class="block text-[10px] font-mono text-[var(--text-muted)] uppercase">
            Fuente del título
          </label>
          <select
            :value="activeFormat.fontFamily"
            class="w-full h-8 px-2.5 rounded-xl neu-well-sm bg-transparent text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/50 cursor-pointer"
            @change="updateField('fontFamily', ($event.target as HTMLSelectElement).value)"
          >
            <option
              v-for="font in titleFontOptions"
              :key="font.label"
              :value="font.value"
              class="bg-[var(--bg-surface)] text-[var(--text-primary)]"
            >
              {{ font.label }}
            </option>
          </select>
        </div>

        <!-- 3. Color del Texto del Título -->
        <div class="space-y-1.5">
          <div class="flex items-center justify-between">
            <label class="text-[10px] font-mono text-[var(--text-muted)] uppercase">
              Color del título
            </label>
            <span class="text-[10px] font-mono text-[var(--text-muted)]">
              {{ activeFormat.color || 'Tema actual' }}
            </span>
          </div>

          <div class="flex items-center justify-between gap-2">
            <!-- Swatches rápidos -->
            <div class="flex items-center gap-1.5 flex-wrap">
              <button
                v-for="swatch in titleColorSwatches"
                :key="swatch.label"
                type="button"
                class="w-5 h-5 rounded-full border border-black/20 flex items-center justify-center transition-transform hover:scale-110 cursor-pointer relative"
                :style="{
                  backgroundColor: swatch.value || 'var(--text-primary)'
                }"
                :title="swatch.label"
                @click="updateField('color', swatch.value)"
              >
                <Check
                  v-if="activeFormat.color === swatch.value"
                  :size="10"
                  class="text-white drop-shadow"
                />
              </button>
            </div>

            <!-- Selector de color nativo + Hex -->
            <div class="inline-flex items-center gap-1 neu-well-sm px-1.5 py-0.5 rounded-lg">
              <input
                type="color"
                :value="activeFormat.color || '#261C14'"
                class="w-4 h-4 rounded cursor-pointer border-0 bg-transparent p-0"
                title="Elegir color personalizado"
                @input="updateField('color', ($event.target as HTMLInputElement).value)"
              />
              <input
                type="text"
                :value="activeFormat.color"
                placeholder="#Hex"
                maxlength="7"
                class="w-14 bg-transparent border-none focus:outline-none text-[10px] font-mono text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/60"
                @change="handleHexColorInput"
              />
            </div>
          </div>
        </div>

        <!-- 4. Interruptor de Línea Divisoria Horizontal -->
        <div
          class="flex items-center justify-between pt-1 border-t border-[var(--groove-dark)]/30"
        >
          <div class="flex items-center gap-2">
            <Minus :size="13" class="text-[var(--accent)]" />
            <div>
              <div class="text-xs font-medium text-[var(--text-primary)]">
                Línea divisoria inferior
              </div>
              <div class="text-[10px] text-[var(--text-muted)]">
                Separador bajo el encabezado en Editor y PDF
              </div>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            :aria-checked="activeFormat.showDivider"
            class="w-9 h-5 rounded-full transition-colors p-0.5 cursor-pointer relative"
            :class="
              activeFormat.showDivider ? 'bg-[var(--accent)]' : 'neu-well-sm bg-[var(--groove-dark)]'
            "
            @click="toggleDivider"
          >
            <span
              class="block w-4 h-4 rounded-full bg-white shadow transition-transform"
              :class="activeFormat.showDivider ? 'translate-x-4' : 'translate-x-0'"
            ></span>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>


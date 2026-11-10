<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { onClickOutside } from '@vueuse/core'
import {
  Undo,
  Redo,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  Pilcrow,
  Quote,
  Baseline,
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignJustify,
  AlignRight,
  IndentIncrease,
  IndentDecrease,
  List,
  ListOrdered,
  Type,
  ChevronDown,
  RotateCcw
} from 'lucide-vue-next'
import { setHeadingSmart, setParagraphSmart, setBlockquoteSmart } from './utils/blockFormatting'
import HybridFontSizeSelect from './HybridFontSizeSelect.vue'
import SpellcheckLanguageToggle from './SpellcheckLanguageToggle.vue'
import { useSpellcheck } from '../../composables/useSpellcheck'
import { modKey } from '../../utils/platform'
import type { BulletListStyle, OrderedListType } from './extensions/ListExtensions'

const props = defineProps<{
  editor: Editor | null | undefined
}>()

const { spellcheckLang, detectedLang, setSpellcheckLanguage } = useSpellcheck()

// Minimodales: Fuente, Color, Resaltado, Listas
type ActiveModal = 'font' | 'color' | 'highlight' | 'bulletList' | 'orderedList' | null
const activeModal = ref<ActiveModal>(null)

const fontModalRef = ref<HTMLElement | null>(null)
const colorModalRef = ref<HTMLElement | null>(null)
const highlightModalRef = ref<HTMLElement | null>(null)
const bulletModalRef = ref<HTMLElement | null>(null)
const orderedModalRef = ref<HTMLElement | null>(null)

const currentBodyFontSize = ref<number>(18)

function toggleModal(name: ActiveModal): void {
  activeModal.value = activeModal.value === name ? null : name
}

function closeModal(): void {
  activeModal.value = null
}

onClickOutside(fontModalRef, () => {
  if (activeModal.value === 'font') closeModal()
})
onClickOutside(colorModalRef, () => {
  if (activeModal.value === 'color') closeModal()
})
onClickOutside(highlightModalRef, () => {
  if (activeModal.value === 'highlight') closeModal()
})
onClickOutside(bulletModalRef, () => {
  if (activeModal.value === 'bulletList') closeModal()
})
onClickOutside(orderedModalRef, () => {
  if (activeModal.value === 'orderedList') closeModal()
})

// Opciones de Listas Desordenadas (Viñetas)
interface BulletOption {
  value: BulletListStyle
  label: string
  symbol: string
  description: string
}

const bulletOptions: BulletOption[] = [
  { value: 'disc', label: 'Disco (Clásico)', symbol: '•', description: 'Punto relleno estándar' },
  { value: 'circle', label: 'Círculo hueco', symbol: '◦', description: 'Círculo sutil editorial' },
  { value: 'square', label: 'Cuadrado', symbol: '▪', description: 'Cuadrado geométrico' },
  { value: 'dash', label: 'Guión narrativo', symbol: '–', description: 'Raya literaria de diálogo' }
]

// Opciones de Listas Ordenadas (Numeración)
interface OrderedOption {
  value: OrderedListType
  label: string
  symbol: string
  description: string
}

const orderedOptions: OrderedOption[] = [
  { value: '1', label: 'Decimales (1, 2, 3)', symbol: '1, 2, 3', description: '1. 2. 3. Números estándar' },
  { value: 'a', label: 'Letras minúsculas (a, b, c)', symbol: 'a, b, c', description: 'a. b. c. Letras en minúscula' },
  { value: 'A', label: 'Letras mayúsculas (A, B, C)', symbol: 'A, B, C', description: 'A. B. C. Letras en mayúscula' },
  { value: 'i', label: 'Romanos minúsculas (i, ii, iii)', symbol: 'i, ii, iii', description: 'i. ii. iii. Números romanos' },
  { value: 'I', label: 'Romanos mayúsculas (I, II, III)', symbol: 'I, II, III', description: 'I. II. III. Números romanos clásicos' }
]

const lastBulletStyle = ref<BulletListStyle>('disc')
const lastOrderedType = ref<OrderedListType>('1')

const currentBulletStyle = computed<BulletListStyle>(() => {
  if (!props.editor?.isActive('bulletList')) return lastBulletStyle.value
  return props.editor.getAttributes('bulletList').listStyle || 'disc'
})

const currentOrderedType = computed<OrderedListType>(() => {
  if (!props.editor?.isActive('orderedList')) return lastOrderedType.value
  return props.editor.getAttributes('orderedList').type || '1'
})

function toggleBulletListDefault(): void {
  if (!props.editor) return
  if (props.editor.isActive('bulletList')) {
    props.editor.chain().focus().toggleBulletList().run()
  } else {
    props.editor
      .chain()
      .focus()
      .toggleBulletList()
      .updateAttributes('bulletList', { listStyle: lastBulletStyle.value })
      .run()
  }
}

function applyBulletListStyle(style: BulletListStyle): void {
  if (!props.editor) return
  lastBulletStyle.value = style
  if (props.editor.isActive('bulletList')) {
    if (props.editor.getAttributes('bulletList').listStyle === style) {
      props.editor.chain().focus().toggleBulletList().run()
    } else {
      props.editor.chain().focus().updateAttributes('bulletList', { listStyle: style }).run()
    }
  } else {
    props.editor
      .chain()
      .focus()
      .toggleBulletList()
      .updateAttributes('bulletList', { listStyle: style })
      .run()
  }
  closeModal()
}

function toggleOrderedListDefault(): void {
  if (!props.editor) return
  if (props.editor.isActive('orderedList')) {
    props.editor.chain().focus().toggleOrderedList().run()
  } else {
    props.editor
      .chain()
      .focus()
      .toggleOrderedList()
      .updateAttributes('orderedList', { type: lastOrderedType.value })
      .run()
  }
}

function applyOrderedListStyle(type: OrderedListType): void {
  if (!props.editor) return
  lastOrderedType.value = type
  if (props.editor.isActive('orderedList')) {
    if (props.editor.getAttributes('orderedList').type === type) {
      props.editor.chain().focus().toggleOrderedList().run()
    } else {
      props.editor.chain().focus().updateAttributes('orderedList', { type }).run()
    }
  } else {
    props.editor
      .chain()
      .focus()
      .toggleOrderedList()
      .updateAttributes('orderedList', { type })
      .run()
  }
  closeModal()
}

// Fuentes disponibles
const fontFamilies = [
  { label: 'Editorial (Serif)', value: "'Newsreader', 'Playfair Display', Georgia, serif", preview: 'font-editorial' },
  { label: 'Moderna (Sans)', value: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", preview: 'font-sans' },
  { label: 'Mecanográfica (Mono)', value: "'Courier Prime', 'Courier New', monospace", preview: 'font-mono' },
  { label: 'Literaria (Garamond)', value: "'EB Garamond', Georgia, serif", preview: 'font-serif' },
  { label: 'Por Defecto', value: '', preview: 'font-editorial' }
]

function selectFontFamily(fontValue: string): void {
  if (!props.editor) return
  if (!fontValue) {
    props.editor.chain().focus().unsetFontFamily().run()
  } else {
    props.editor.chain().focus().setFontFamily(fontValue).run()
  }
  closeModal()
}

function selectFontSize(sizeValue: string, numericVal?: number): void {
  if (!props.editor) return
  if (!sizeValue) {
    props.editor.chain().focus().unsetFontSize().run()
  } else {
    if (numericVal !== undefined) {
      currentBodyFontSize.value = numericVal
    }
    props.editor.chain().focus().setFontSize(sizeValue).run()
  }
}

function resetFontSize(): void {
  if (!props.editor) return
  currentBodyFontSize.value = 18
  props.editor.chain().focus().unsetFontSize().run()
}

// Paleta de colores cálidos de texto
const textColors = [
  { label: 'Terracota', value: '#C85A32' },
  { label: 'Ámbar Cálido', value: '#D97706' },
  { label: 'Verde Esmeralda', value: '#059669' },
  { label: 'Azul Tinta', value: '#2563EB' },
  { label: 'Púrpura Borgoña', value: '#7C2D12' },
  { label: 'Violeta Clásico', value: '#7C3AED' },
  { label: 'Gris Carbón', value: '#4B5563' }
]

function selectColor(color: string): void {
  if (!props.editor) return
  props.editor.chain().focus().setColor(color).run()
  closeModal()
}

function resetColor(): void {
  if (!props.editor) return
  props.editor.chain().focus().unsetColor().run()
  closeModal()
}

// Paleta de resaltadores suaves
const highlightColors = [
  { label: 'Amarillo Pastel', value: '#FEF08A' },
  { label: 'Terracota Suave', value: '#FED7AA' },
  { label: 'Verde Menta', value: '#BBF7D0' },
  { label: 'Celeste Papel', value: '#BAE6FD' },
  { label: 'Lavanda Cálido', value: '#E9D5FF' }
]

function selectHighlight(color: string): void {
  if (!props.editor) return
  props.editor.chain().focus().toggleHighlight({ color }).run()
  closeModal()
}

function resetHighlight(): void {
  if (!props.editor) return
  props.editor.chain().focus().unsetHighlight().run()
  closeModal()
}

// Inserción de tabulación no destructiva (2 espacios)
function insertTabSpaces(): void {
  if (!props.editor) return
  props.editor.chain().focus().insertContent('  ').run()
}

// Sangría de bloque (aumentar / reducir)
function handleIndent(): void {
  if (!props.editor) return
  props.editor.chain().focus().indent().run()
}

function handleOutdent(): void {
  if (!props.editor) return
  props.editor.chain().focus().outdent().run()
}

// Florón de descanso de escena (* * *)
function insertSceneBreak(): void {
  if (!props.editor) return
  props.editor.chain().focus().setSceneBreak().run()
}
</script>

<template>
  <div
    class="editor-toolbar w-full neu-surface px-2.5 py-1 text-xs select-none border-b border-[var(--groove-dark)]/30 backdrop-blur-md relative z-30"
  >
    <!-- Contenedor horizontal en una sola fila fija (nunca se parte ni se descoloca) -->
    <div class="flex items-center gap-1 flex-nowrap w-full">
      <!-- 1. Deshacer / Rehacer -->
      <div class="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          class="neu-btn w-7 h-7 flex items-center justify-center transition-all cursor-pointer text-[var(--text-secondary)] disabled:opacity-30 disabled:cursor-not-allowed hover:text-[var(--text-primary)]"
          :disabled="!editor?.can().undo()"
          :title="`Deshacer (${modKey}+Z)`"
          @mousedown.prevent
          @click="editor?.chain().focus().undo().run()"
        >
          <Undo :size="13" />
        </button>

        <button
          type="button"
          class="neu-btn w-7 h-7 flex items-center justify-center transition-all cursor-pointer text-[var(--text-secondary)] disabled:opacity-30 disabled:cursor-not-allowed hover:text-[var(--text-primary)]"
          :disabled="!editor?.can().redo()"
          :title="`Rehacer (${modKey}+Y)`"
          @mousedown.prevent
          @click="editor?.chain().focus().redo().run()"
        >
          <Redo :size="13" />
        </button>
      </div>

      <div class="neu-groove-v h-4 my-auto shrink-0 mx-0.5"></div>

      <!-- 2. Minimodal de Fuente Tipográfica -->
      <div ref="fontModalRef" class="relative shrink-0">
        <button
          type="button"
          class="neu-btn px-2 h-7 flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
          :class="{ 'neu-well !text-[var(--accent)] font-semibold': activeModal === 'font' }"
          title="Elegir familia tipográfica"
          @mousedown.prevent
          @click="toggleModal('font')"
        >
          <Type :size="13" />
          <span class="text-[11px] font-medium hidden sm:inline">Fuente</span>
          <ChevronDown :size="11" class="opacity-70" />
        </button>

        <!-- Minimodal Flotante de Fuentes -->
        <Transition
          enter-active-class="transition duration-100 ease-out"
          enter-from-class="opacity-0 translate-y-1 scale-95"
          enter-to-class="opacity-100 translate-y-0 scale-100"
          leave-active-class="transition duration-75 ease-in"
          leave-from-class="opacity-100 translate-y-0 scale-100"
          leave-to-class="opacity-0 translate-y-1 scale-95"
        >
          <div
            v-if="activeModal === 'font'"
            class="absolute left-0 top-full mt-2 z-50 neu-surface p-1.5 min-w-[180px] shadow-2xl rounded-xl border border-[var(--groove-dark)]/60 backdrop-blur-lg bg-[var(--bg-surface)]"
          >
            <div class="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--groove-dark)]/30 mb-1">
              Tipografía Editorial
            </div>
            <button
              v-for="font in fontFamilies"
              :key="font.label"
              type="button"
              class="w-full px-2.5 py-1.5 rounded-lg text-left text-xs flex items-center justify-between hover:bg-[var(--bg-base)] transition-colors cursor-pointer text-[var(--text-primary)]"
              :class="font.preview"
              @mousedown.prevent
              @click="selectFontFamily(font.value)"
            >
              <span>{{ font.label }}</span>
            </button>
          </div>
        </Transition>
      </div>

      <!-- 3. Selector de Tamaño de Fuente Híbrido (Preset + Input Manual con decimales) -->
      <HybridFontSizeSelect
        v-model="currentBodyFontSize"
        unit="px"
        :min="6"
        :max="96"
        :presets="[10, 11, 12, 13.5, 14, 16, 18, 20, 24, 28, 32, 36, 48]"
        :allow-reset="true"
        placeholder="18"
        title="Tamaño de letra del cuerpo (escribe cualquier valor, ej. 13.5, o elige de la lista)"
        @apply="(cssVal, numVal) => selectFontSize(cssVal, numVal)"
        @reset="resetFontSize"
      />

      <div class="neu-groove-v h-4 my-auto shrink-0 mx-0.5"></div>

      <!-- 4. Jerarquía / Encabezados -->
      <div class="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          class="neu-btn w-7 h-7 flex items-center justify-center transition-all cursor-pointer text-[var(--text-secondary)]"
          :class="{ 'neu-well !text-[var(--accent)] font-bold': editor?.isActive('paragraph') && !editor?.isActive('heading') && !editor?.isActive('blockquote') }"
          title="Párrafo normal"
          @mousedown.prevent
          @click="setParagraphSmart(editor)"
        >
          <Pilcrow :size="13" />
        </button>

        <button
          type="button"
          class="neu-btn w-7 h-7 flex items-center justify-center transition-all cursor-pointer text-[var(--text-secondary)]"
          :class="{ 'neu-well !text-[var(--accent)] font-bold': editor?.isActive('heading', { level: 1 }) }"
          title="Encabezado 1 (Título)"
          @mousedown.prevent
          @click="setHeadingSmart(editor, 1)"
        >
          <Heading1 :size="13" />
        </button>

        <button
          type="button"
          class="neu-btn w-7 h-7 flex items-center justify-center transition-all cursor-pointer text-[var(--text-secondary)]"
          :class="{ 'neu-well !text-[var(--accent)] font-bold': editor?.isActive('heading', { level: 2 }) }"
          title="Encabezado 2 (Subtítulo de escena)"
          @mousedown.prevent
          @click="setHeadingSmart(editor, 2)"
        >
          <Heading2 :size="13" />
        </button>

        <button
          type="button"
          class="neu-btn w-7 h-7 flex items-center justify-center transition-all cursor-pointer text-[var(--text-secondary)]"
          :class="{ 'neu-well !text-[var(--accent)] font-bold': editor?.isActive('heading', { level: 3 }) }"
          title="Encabezado 3 (Sección)"
          @mousedown.prevent
          @click="setHeadingSmart(editor, 3)"
        >
          <Heading3 :size="13" />
        </button>

        <button
          type="button"
          class="neu-btn w-7 h-7 flex items-center justify-center transition-all cursor-pointer text-[var(--text-secondary)]"
          :class="{ 'neu-well !text-[var(--accent)] font-bold': editor?.isActive('blockquote') }"
          title="Cita en bloque editorial"
          @mousedown.prevent
          @click="setBlockquoteSmart(editor)"
        >
          <Quote :size="13" />
        </button>
      </div>

      <div class="neu-groove-v h-4 my-auto shrink-0 mx-0.5"></div>

      <!-- 5. Formato: Negrita, Cursiva, Subrayado, Tachado -->
      <div class="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          class="neu-btn w-7 h-7 flex items-center justify-center transition-all cursor-pointer text-[var(--text-secondary)]"
          :class="{ 'neu-well !text-[var(--accent)] font-bold': editor?.isActive('bold') }"
          :title="`Negrita (${modKey}+B)`"
          @mousedown.prevent
          @click="editor?.chain().focus().toggleBold().run()"
        >
          <Bold :size="13" />
        </button>

        <button
          type="button"
          class="neu-btn w-7 h-7 flex items-center justify-center transition-all cursor-pointer text-[var(--text-secondary)]"
          :class="{ 'neu-well !text-[var(--accent)] font-bold': editor?.isActive('italic') }"
          :title="`Cursiva (${modKey}+I)`"
          @mousedown.prevent
          @click="editor?.chain().focus().toggleItalic().run()"
        >
          <Italic :size="13" />
        </button>

        <button
          type="button"
          class="neu-btn w-7 h-7 flex items-center justify-center transition-all cursor-pointer text-[var(--text-secondary)]"
          :class="{ 'neu-well !text-[var(--accent)] font-bold': editor?.isActive('underline') }"
          :title="`Subrayado (${modKey}+U)`"
          @mousedown.prevent
          @click="editor?.chain().focus().toggleUnderline().run()"
        >
          <Underline :size="13" />
        </button>

        <button
          type="button"
          class="neu-btn w-7 h-7 flex items-center justify-center transition-all cursor-pointer text-[var(--text-secondary)]"
          :class="{ 'neu-well !text-[var(--accent)] font-bold': editor?.isActive('strike') }"
          :title="`Tachado (${modKey}+Shift+X)`"
          @mousedown.prevent
          @click="editor?.chain().focus().toggleStrike().run()"
        >
          <Strikethrough :size="13" />
        </button>
      </div>

      <div class="neu-groove-v h-4 my-auto shrink-0 mx-0.5"></div>

      <!-- 6. Minimodales de Color & Resaltador -->
      <div class="flex items-center gap-0.5 shrink-0">
        <!-- Minimodal Color de Texto -->
        <div ref="colorModalRef" class="relative">
          <button
            type="button"
            class="neu-btn px-2 h-7 flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
            :class="{ 'neu-well !text-[var(--accent)] font-semibold': activeModal === 'color' }"
            title="Color de texto"
            @mousedown.prevent
            @click="toggleModal('color')"
          >
            <Baseline :size="13" class="text-[var(--accent)]" />
            <span class="text-[11px] font-medium hidden xl:inline">Color</span>
          </button>

          <Transition
            enter-active-class="transition duration-100 ease-out"
            enter-from-class="opacity-0 translate-y-1 scale-95"
            enter-to-class="opacity-100 translate-y-0 scale-100"
            leave-active-class="transition duration-75 ease-in"
            leave-from-class="opacity-100 translate-y-0 scale-100"
            leave-to-class="opacity-0 translate-y-1 scale-95"
          >
            <div
              v-if="activeModal === 'color'"
              class="absolute left-0 top-full mt-2 z-50 neu-surface p-2.5 min-w-[190px] shadow-2xl rounded-xl border border-[var(--groove-dark)]/60 backdrop-blur-lg bg-[var(--bg-surface)] flex flex-col gap-2"
            >
              <div class="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider mb-0.5">
                Color de Letra
              </div>

              <div class="grid grid-cols-4 gap-1.5">
                <button
                  v-for="color in textColors"
                  :key="color.value"
                  type="button"
                  class="w-6 h-6 rounded-full border border-black/15 transition-transform hover:scale-115 active:scale-95 shadow-sm cursor-pointer"
                  :style="{ backgroundColor: color.value }"
                  :title="color.label"
                  @mousedown.prevent
                  @click="selectColor(color.value)"
                ></button>
              </div>

              <div class="neu-groove-h my-0.5"></div>

              <button
                type="button"
                class="w-full px-2 py-1 rounded text-left text-xs flex items-center gap-2 hover:bg-[var(--bg-base)] text-[var(--text-secondary)] transition-colors cursor-pointer"
                @mousedown.prevent
                @click="resetColor"
              >
                <RotateCcw :size="11" />
                <span>Restablecer color</span>
              </button>
            </div>
          </Transition>
        </div>

        <!-- Minimodal Resaltador -->
        <div ref="highlightModalRef" class="relative">
          <button
            type="button"
            class="neu-btn px-2 h-7 flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
            :class="{ 'neu-well !text-[var(--accent)] font-semibold': activeModal === 'highlight' || editor?.isActive('highlight') }"
            title="Resaltar texto"
            @mousedown.prevent
            @click="toggleModal('highlight')"
          >
            <Highlighter :size="13" />
            <span class="text-[11px] font-medium hidden xl:inline">Resaltar</span>
          </button>

          <Transition
            enter-active-class="transition duration-100 ease-out"
            enter-from-class="opacity-0 translate-y-1 scale-95"
            enter-to-class="opacity-100 translate-y-0 scale-100"
            leave-active-class="transition duration-75 ease-in"
            leave-from-class="opacity-100 translate-y-0 scale-100"
            leave-to-class="opacity-0 translate-y-1 scale-95"
          >
            <div
              v-if="activeModal === 'highlight'"
              class="absolute left-0 top-full mt-2 z-50 neu-surface p-2.5 min-w-[180px] shadow-2xl rounded-xl border border-[var(--groove-dark)]/60 backdrop-blur-lg bg-[var(--bg-surface)] flex flex-col gap-2"
            >
              <div class="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider mb-0.5">
                Color de Resaltado
              </div>

              <div class="flex items-center gap-1.5">
                <button
                  v-for="h in highlightColors"
                  :key="h.value"
                  type="button"
                  class="w-6 h-6 rounded-md border border-black/15 transition-transform hover:scale-115 active:scale-95 shadow-sm cursor-pointer"
                  :style="{ backgroundColor: h.value }"
                  :title="h.label"
                  @mousedown.prevent
                  @click="selectHighlight(h.value)"
                ></button>
              </div>

              <div class="neu-groove-h my-0.5"></div>

              <button
                type="button"
                class="w-full px-2 py-1 rounded text-left text-xs flex items-center gap-2 hover:bg-[var(--bg-base)] text-[var(--text-secondary)] transition-colors cursor-pointer"
                @mousedown.prevent
                @click="resetHighlight"
              >
                <RotateCcw :size="11" />
                <span>Quitar resaltado</span>
              </button>
            </div>
          </Transition>
        </div>
      </div>

      <div class="neu-groove-v h-4 my-auto shrink-0 mx-0.5"></div>

      <!-- 7. Alineación de Texto -->
      <div class="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          class="neu-btn w-7 h-7 flex items-center justify-center transition-all cursor-pointer text-[var(--text-secondary)]"
          :class="{ 'neu-well !text-[var(--accent)] font-bold': editor?.isActive({ textAlign: 'left' }) }"
          title="Alinear a la izquierda"
          @mousedown.prevent
          @click="editor?.chain().focus().setTextAlign('left').run()"
        >
          <AlignLeft :size="13" />
        </button>

        <button
          type="button"
          class="neu-btn w-7 h-7 flex items-center justify-center transition-all cursor-pointer text-[var(--text-secondary)]"
          :class="{ 'neu-well !text-[var(--accent)] font-bold': editor?.isActive({ textAlign: 'center' }) }"
          title="Centrar texto"
          @mousedown.prevent
          @click="editor?.chain().focus().setTextAlign('center').run()"
        >
          <AlignCenter :size="13" />
        </button>

        <button
          type="button"
          class="neu-btn w-7 h-7 flex items-center justify-center transition-all cursor-pointer text-[var(--text-secondary)]"
          :class="{ 'neu-well !text-[var(--accent)] font-bold': editor?.isActive({ textAlign: 'justify' }) }"
          title="Justificar texto"
          @mousedown.prevent
          @click="editor?.chain().focus().setTextAlign('justify').run()"
        >
          <AlignJustify :size="13" />
        </button>

        <button
          type="button"
          class="neu-btn w-7 h-7 flex items-center justify-center transition-all cursor-pointer text-[var(--text-secondary)]"
          :class="{ 'neu-well !text-[var(--accent)] font-bold': editor?.isActive({ textAlign: 'right' }) }"
          title="Alinear a la derecha"
          @mousedown.prevent
          @click="editor?.chain().focus().setTextAlign('right').run()"
        >
          <AlignRight :size="13" />
        </button>
      </div>

      <div class="neu-groove-v h-4 my-auto shrink-0 mx-0.5"></div>

      <!-- 8. Tabulación & Sangría -->
      <div class="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          class="neu-btn px-2 h-7 flex items-center gap-1 text-[11px] font-mono transition-all cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          title="Insertar Tabulación (2 espacios)"
          @mousedown.prevent
          @click="insertTabSpaces"
        >
          <span class="font-bold">⇥</span>
          <span class="text-[10px] hidden xl:inline">Tab</span>
        </button>

        <button
          type="button"
          class="neu-btn w-7 h-7 flex items-center justify-center transition-all cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          title="Aumentar Sangría de Párrafo"
          @mousedown.prevent
          @click="handleIndent"
        >
          <IndentIncrease :size="13" />
        </button>

        <button
          type="button"
          class="neu-btn w-7 h-7 flex items-center justify-center transition-all cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          title="Disminuir Sangría de Párrafo (Shift+Tab)"
          @mousedown.prevent
          @click="handleOutdent"
        >
          <IndentDecrease :size="13" />
        </button>
      </div>

      <div class="neu-groove-v h-4 my-auto shrink-0 mx-0.5"></div>

      <!-- 9. Listas & Florón Narrativo Clásico -->
      <div class="flex items-center gap-1.5 shrink-0">
        <!-- Lista de viñetas con selector de estilo -->
        <div ref="bulletModalRef" class="relative flex items-center">
          <div
            class="flex items-center rounded-lg overflow-hidden transition-all shadow-sm"
            :class="editor?.isActive('bulletList') ? 'neu-well' : 'neu-surface'"
          >
            <button
              type="button"
              class="w-6 h-7 flex items-center justify-center transition-all cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              :class="{ '!text-[var(--accent)] font-bold': editor?.isActive('bulletList') }"
              title="Alternar lista de viñetas"
              @mousedown.prevent
              @click="toggleBulletListDefault"
            >
              <List :size="13" />
            </button>
            <button
              type="button"
              class="w-4 h-7 flex items-center justify-center transition-all cursor-pointer text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--bg-elevated)]/50 border-l border-[var(--groove-dark)]/20"
              :class="{ '!text-[var(--accent)] bg-[var(--accent)]/10': activeModal === 'bulletList' }"
              title="Elegir tipo de viñeta (disco, círculo, cuadrado, guión)"
              @mousedown.prevent
              @click="toggleModal('bulletList')"
            >
              <ChevronDown :size="10" />
            </button>
          </div>

          <!-- Menú desplegable de viñetas -->
          <Transition
            enter-active-class="transition duration-100 ease-out"
            enter-from-class="opacity-0 translate-y-1 scale-95"
            enter-to-class="opacity-100 translate-y-0 scale-100"
            leave-active-class="transition duration-75 ease-in"
            leave-from-class="opacity-100 translate-y-0 scale-100"
            leave-to-class="opacity-0 translate-y-1 scale-95"
          >
            <div
              v-if="activeModal === 'bulletList'"
              class="absolute left-0 top-full mt-2 z-50 neu-surface p-2 min-w-[210px] shadow-2xl rounded-xl border border-[var(--groove-dark)]/60 backdrop-blur-lg bg-[var(--bg-surface)] flex flex-col gap-1"
            >
              <div class="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider px-2 py-0.5">
                Tipos de Viñetas
              </div>

              <button
                v-for="opt in bulletOptions"
                :key="opt.value"
                type="button"
                class="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-left transition-all cursor-pointer group"
                :class="
                  currentBulletStyle === opt.value && editor?.isActive('bulletList')
                    ? 'neu-well text-[var(--accent)] font-bold'
                    : 'hover:bg-[var(--bg-base)] text-[var(--text-primary)]'
                "
                @mousedown.prevent
                @click="applyBulletListStyle(opt.value)"
              >
                <span
                  class="w-6 h-6 rounded flex items-center justify-center text-sm font-bold bg-[var(--bg-base)] text-[var(--accent)] shrink-0 shadow-inner group-hover:scale-110 transition-transform"
                >
                  {{ opt.symbol }}
                </span>
                <div class="min-w-0 flex-1">
                  <div class="text-xs font-semibold leading-tight">{{ opt.label }}</div>
                  <div class="text-[10px] text-[var(--text-muted)] leading-tight mt-0.5 truncate">{{ opt.description }}</div>
                </div>
              </button>
            </div>
          </Transition>
        </div>

        <!-- Lista numerada con selector de formato -->
        <div ref="orderedModalRef" class="relative flex items-center">
          <div
            class="flex items-center rounded-lg overflow-hidden transition-all shadow-sm"
            :class="editor?.isActive('orderedList') ? 'neu-well' : 'neu-surface'"
          >
            <button
              type="button"
              class="w-6 h-7 flex items-center justify-center transition-all cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              :class="{ '!text-[var(--accent)] font-bold': editor?.isActive('orderedList') }"
              title="Alternar lista numerada"
              @mousedown.prevent
              @click="toggleOrderedListDefault"
            >
              <ListOrdered :size="13" />
            </button>
            <button
              type="button"
              class="w-4 h-7 flex items-center justify-center transition-all cursor-pointer text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--bg-elevated)]/50 border-l border-[var(--groove-dark)]/20"
              :class="{ '!text-[var(--accent)] bg-[var(--accent)]/10': activeModal === 'orderedList' }"
              title="Elegir formato numerado (1, a, A, i, I)"
              @mousedown.prevent
              @click="toggleModal('orderedList')"
            >
              <ChevronDown :size="10" />
            </button>
          </div>

          <!-- Menú desplegable de lista ordenada -->
          <Transition
            enter-active-class="transition duration-100 ease-out"
            enter-from-class="opacity-0 translate-y-1 scale-95"
            enter-to-class="opacity-100 translate-y-0 scale-100"
            leave-active-class="transition duration-75 ease-in"
            leave-from-class="opacity-100 translate-y-0 scale-100"
            leave-to-class="opacity-0 translate-y-1 scale-95"
          >
            <div
              v-if="activeModal === 'orderedList'"
              class="absolute left-0 top-full mt-2 z-50 neu-surface p-2 min-w-[230px] shadow-2xl rounded-xl border border-[var(--groove-dark)]/60 backdrop-blur-lg bg-[var(--bg-surface)] flex flex-col gap-1"
            >
              <div class="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider px-2 py-0.5">
                Formatos de Numeración
              </div>

              <button
                v-for="opt in orderedOptions"
                :key="opt.value"
                type="button"
                class="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-left transition-all cursor-pointer group"
                :class="
                  currentOrderedType === opt.value && editor?.isActive('orderedList')
                    ? 'neu-well text-[var(--accent)] font-bold'
                    : 'hover:bg-[var(--bg-base)] text-[var(--text-primary)]'
                "
                @mousedown.prevent
                @click="applyOrderedListStyle(opt.value)"
              >
                <span
                  class="w-7 h-6 rounded flex items-center justify-center text-xs font-mono font-bold bg-[var(--bg-base)] text-[var(--accent)] shrink-0 shadow-inner group-hover:scale-105 transition-transform"
                >
                  {{ opt.symbol.split(',')[0] }}.
                </span>
                <div class="min-w-0 flex-1">
                  <div class="text-xs font-semibold leading-tight">{{ opt.label }}</div>
                  <div class="text-[10px] text-[var(--text-muted)] leading-tight mt-0.5 truncate">{{ opt.description }}</div>
                </div>
              </button>
            </div>
          </Transition>
        </div>

        <!-- Florón Narrativo de Escena (* * *) Destacado -->
        <button
          type="button"
          class="neu-btn px-2.5 h-7 flex items-center gap-1 transition-all cursor-pointer font-bold text-[var(--accent)] hover:!text-[var(--accent-hover)] bg-[var(--accent)]/5 hover:bg-[var(--accent)]/10 border border-[var(--accent)]/30 rounded-lg shadow-sm"
          title="Añadir Florón de Corte Narrativo (* * *)"
          @mousedown.prevent
          @click="insertSceneBreak"
        >
          <span class="font-mono text-xs tracking-widest leading-none">* * *</span>
          <span class="text-[10px] font-sans font-medium hidden sm:inline">Florón</span>
        </button>
      </div>

      <div class="neu-groove-v h-4 my-auto shrink-0 mx-0.5"></div>

      <!-- 10. Corrector Ortográfico (Español / English) -->
      <SpellcheckLanguageToggle
        :current-lang="spellcheckLang"
        :detected-lang="detectedLang"
        @update:lang="setSpellcheckLanguage"
      />
    </div>
  </div>
</template>

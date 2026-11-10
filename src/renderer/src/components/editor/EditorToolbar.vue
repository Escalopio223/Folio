<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { computePosition, flip, shift, offset, autoUpdate } from '@floating-ui/dom'
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
  MoveVertical,
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

// Minimodales: Fuente, Color, Resaltado, Listas, Interlineado
type ActiveModal = 'font' | 'color' | 'highlight' | 'bulletList' | 'orderedList' | 'lineHeight' | null
const activeModal = ref<ActiveModal>(null)

// Referencias a los disparadores (botones en la barra)
const fontTriggerRef = ref<HTMLElement | null>(null)
const colorTriggerRef = ref<HTMLElement | null>(null)
const highlightTriggerRef = ref<HTMLElement | null>(null)
const bulletTriggerRef = ref<HTMLElement | null>(null)
const orderedTriggerRef = ref<HTMLElement | null>(null)
const lineHeightTriggerRef = ref<HTMLElement | null>(null)

// Referencias a los popovers flotantes (teleportados al body)
const fontPopoverRef = ref<HTMLElement | null>(null)
const colorPopoverRef = ref<HTMLElement | null>(null)
const highlightPopoverRef = ref<HTMLElement | null>(null)
const bulletPopoverRef = ref<HTMLElement | null>(null)
const orderedPopoverRef = ref<HTMLElement | null>(null)
const lineHeightPopoverRef = ref<HTMLElement | null>(null)

const currentBodyFontSize = ref<number>(18)

function toggleModal(name: ActiveModal): void {
  activeModal.value = activeModal.value === name ? null : name
}

function closeModal(): void {
  activeModal.value = null
}

// Limpieza y cálculo reactivo de posición flotante para popovers teleportados al body
let cleanupFloating: (() => void) | null = null

function updateActiveFloating(): void {
  if (cleanupFloating) {
    cleanupFloating()
    cleanupFloating = null
  }

  const modal = activeModal.value
  if (!modal) return

  nextTick(() => {
    let trigger: HTMLElement | null = null
    let popover: HTMLElement | null = null

    switch (modal) {
      case 'font':
        trigger = fontTriggerRef.value
        popover = fontPopoverRef.value
        break
      case 'color':
        trigger = colorTriggerRef.value
        popover = colorPopoverRef.value
        break
      case 'highlight':
        trigger = highlightTriggerRef.value
        popover = highlightPopoverRef.value
        break
      case 'lineHeight':
        trigger = lineHeightTriggerRef.value
        popover = lineHeightPopoverRef.value
        break
      case 'bulletList':
        trigger = bulletTriggerRef.value
        popover = bulletPopoverRef.value
        break
      case 'orderedList':
        trigger = orderedTriggerRef.value
        popover = orderedPopoverRef.value
        break
    }

    if (!trigger || !popover) return

    cleanupFloating = autoUpdate(trigger, popover, () => {
      if (!trigger || !popover) return
      computePosition(trigger, popover, {
        placement: 'bottom-start',
        strategy: 'fixed',
        middleware: [
          offset(6),
          flip({ fallbackPlacements: ['top-start', 'bottom-end', 'top-end', 'bottom-start'] }),
          shift({ padding: 12 })
        ]
      }).then(({ x, y }) => {
        if (popover) {
          popover.style.left = `${Math.round(x)}px`
          popover.style.top = `${Math.round(y)}px`
        }
      })
    })
  })
}

watch(activeModal, () => {
  updateActiveFloating()
})

// Detección de clics externos para cerrar los minimodales teleportados
onClickOutside(fontPopoverRef, (event) => {
  if (fontTriggerRef.value?.contains(event.target as Node)) return
  if (activeModal.value === 'font') closeModal()
})
onClickOutside(colorPopoverRef, (event) => {
  if (colorTriggerRef.value?.contains(event.target as Node)) return
  if (activeModal.value === 'color') closeModal()
})
onClickOutside(highlightPopoverRef, (event) => {
  if (highlightTriggerRef.value?.contains(event.target as Node)) return
  if (activeModal.value === 'highlight') closeModal()
})
onClickOutside(bulletPopoverRef, (event) => {
  if (bulletTriggerRef.value?.contains(event.target as Node)) return
  if (activeModal.value === 'bulletList') closeModal()
})
onClickOutside(orderedPopoverRef, (event) => {
  if (orderedTriggerRef.value?.contains(event.target as Node)) return
  if (activeModal.value === 'orderedList') closeModal()
})
onClickOutside(lineHeightPopoverRef, (event) => {
  if (lineHeightTriggerRef.value?.contains(event.target as Node)) return
  if (activeModal.value === 'lineHeight') closeModal()
})

function handleGlobalKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape' && activeModal.value !== null) {
    closeModal()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
  if (cleanupFloating) {
    cleanupFloating()
    cleanupFloating = null
  }
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

// =========================================================================
// INTERLINEADO & ESPACIADO VERTICAL (Line Spacing)
// =========================================================================
interface LineHeightOption {
  value: string
  label: string
  description: string
}

const lineHeightPresets: LineHeightOption[] = [
  { value: '1.0', label: '1.0 Sencillo', description: 'Espacio compacto y cerrado' },
  { value: '1.15', label: '1.15 Estándar', description: 'Lectura digital moderna' },
  { value: '1.25', label: '1.25 Cómodo', description: 'Equilibrado y fluido' },
  { value: '1.5', label: '1.5 Editorial', description: 'Clásico de publicación literaria' },
  { value: '1.75', label: '1.75 Holgado', description: 'Amplio para vista descansada' },
  { value: '2.0', label: '2.0 Doble', description: 'Manuscrito para corrección' }
]

const customLineHeight = ref<number>(1.5)

const currentLineHeight = computed<string>(() => {
  if (!props.editor) return '1.5'
  const pAttrs = props.editor.getAttributes('paragraph')
  if (pAttrs?.lineHeight) return String(pAttrs.lineHeight)
  const hAttrs = props.editor.getAttributes('heading')
  if (hAttrs?.lineHeight) return String(hAttrs.lineHeight)
  const bAttrs = props.editor.getAttributes('blockquote')
  if (bAttrs?.lineHeight) return String(bAttrs.lineHeight)
  return 'Auto'
})

const currentLineHeightLabel = computed<string>(() => {
  if (currentLineHeight.value === 'Auto') return '1.5'
  return currentLineHeight.value
})

function applyLineHeight(val: string): void {
  if (!props.editor) return
  const num = parseFloat(val)
  if (!isNaN(num)) {
    customLineHeight.value = num
  }
  props.editor.chain().focus().setLineHeight(val).run()
  closeModal()
}

function applyLineHeightToChapter(val: string): void {
  if (!props.editor) return
  const num = parseFloat(val)
  if (!isNaN(num)) {
    customLineHeight.value = num
  }
  const { tr, doc } = props.editor.state
  let changed = false
  doc.descendants((node, pos) => {
    if (['paragraph', 'heading', 'blockquote', 'listItem'].includes(node.type.name)) {
      tr.setNodeMarkup(pos, undefined, {
        ...node.attrs,
        lineHeight: val
      })
      changed = true
    }
  })
  if (changed) {
    props.editor.view.dispatch(tr)
  }
  closeModal()
}

function adjustCustomLineHeight(delta: number): void {
  const next = Math.max(0.8, Math.min(3.5, Math.round((customLineHeight.value + delta) * 100) / 100))
  customLineHeight.value = next
  applyLineHeight(String(next))
}

function resetLineHeight(): void {
  if (!props.editor) return
  customLineHeight.value = 1.5
  props.editor.chain().focus().unsetLineHeight().run()
  closeModal()
}

// Separación de párrafos (Margen inferior entre párrafos)
const currentParagraphGap = ref<'compact' | 'normal' | 'relaxed'>(
  (localStorage.getItem('folio_paragraph_gap') as 'compact' | 'normal' | 'relaxed') || 'normal'
)

function setParagraphGap(val: 'compact' | 'normal' | 'relaxed'): void {
  currentParagraphGap.value = val
  localStorage.setItem('folio_paragraph_gap', val)
  const remMap = {
    compact: '0.65rem',
    normal: '1.25rem',
    relaxed: '1.85rem'
  }
  document.documentElement.style.setProperty('--editorial-paragraph-gap', remMap[val])
}

onMounted(() => {
  const remMap = {
    compact: '0.65rem',
    normal: '1.25rem',
    relaxed: '1.85rem'
  }
  document.documentElement.style.setProperty(
    '--editorial-paragraph-gap',
    remMap[currentParagraphGap.value] || '1.25rem'
  )
})

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
    class="editor-toolbar w-full neu-surface px-2.5 py-1.5 text-xs select-none border-b border-[var(--groove-dark)]/30 backdrop-blur-md relative z-30 transition-all"
  >
    <!-- Contenedor flexible con salto de línea automático por colisión (flex-wrap) para pantallas pequeñas -->
    <div class="flex flex-wrap items-center gap-x-1.5 gap-y-1.5 w-full">
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
      <div ref="fontTriggerRef" class="relative shrink-0">
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
        <Teleport to="body">
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
              ref="fontPopoverRef"
              class="fixed z-[9999] neu-surface p-1.5 min-w-[180px] shadow-2xl rounded-xl border border-[var(--groove-dark)]/60 backdrop-blur-lg bg-[var(--bg-surface)]"
              @click.stop
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
        </Teleport>
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
        <div ref="colorTriggerRef" class="relative">
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

          <Teleport to="body">
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
                ref="colorPopoverRef"
                class="fixed z-[9999] neu-surface p-2.5 min-w-[190px] shadow-2xl rounded-xl border border-[var(--groove-dark)]/60 backdrop-blur-lg bg-[var(--bg-surface)] flex flex-col gap-2"
                @click.stop
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
          </Teleport>
        </div>

        <!-- Minimodal Resaltador -->
        <div ref="highlightTriggerRef" class="relative">
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

          <Teleport to="body">
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
                ref="highlightPopoverRef"
                class="fixed z-[9999] neu-surface p-2.5 min-w-[180px] shadow-2xl rounded-xl border border-[var(--groove-dark)]/60 backdrop-blur-lg bg-[var(--bg-surface)] flex flex-col gap-2"
                @click.stop
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
          </Teleport>
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

      <!-- 8. Interlineado & Salto de Línea (Espacio entre líneas y párrafos) -->
      <div ref="lineHeightTriggerRef" class="relative shrink-0 flex items-center">
        <button
          type="button"
          class="neu-btn px-2 h-7 flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
          :class="{ 'neu-well !text-[var(--accent)] font-semibold': activeModal === 'lineHeight' }"
          title="Modificar interlineado y espacio entre líneas de texto"
          @mousedown.prevent
          @click="toggleModal('lineHeight')"
        >
          <MoveVertical :size="13" class="text-[var(--accent)]" />
          <span class="text-[11px] font-mono font-medium">{{ currentLineHeightLabel }}</span>
          <ChevronDown :size="10" class="opacity-70" />
        </button>

        <!-- Minimodal Flotante de Interlineado -->
        <Teleport to="body">
          <Transition
            enter-active-class="transition duration-100 ease-out"
            enter-from-class="opacity-0 translate-y-1 scale-95"
            enter-to-class="opacity-100 translate-y-0 scale-100"
            leave-active-class="transition duration-75 ease-in"
            leave-from-class="opacity-100 translate-y-0 scale-100"
            leave-to-class="opacity-0 translate-y-1 scale-95"
          >
            <div
              v-if="activeModal === 'lineHeight'"
              ref="lineHeightPopoverRef"
              class="fixed z-[9999] neu-surface p-2.5 min-w-[245px] shadow-2xl rounded-xl border border-[var(--groove-dark)]/60 backdrop-blur-lg bg-[var(--bg-surface)] flex flex-col gap-2"
              @click.stop
            >
              <div class="flex items-center justify-between border-b border-[var(--groove-dark)]/30 pb-1.5">
                <span class="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                  Interlineado (Líneas)
                </span>
                <span class="text-[10px] font-mono font-bold text-[var(--accent)]">
                  {{ currentLineHeightLabel }}
                </span>
              </div>

              <!-- Ajuste fino numérico con +/- -->
              <div class="flex items-center justify-between gap-1 neu-well-sm p-1 rounded-lg">
                <button
                  type="button"
                  class="w-6 h-6 rounded neu-btn flex items-center justify-center font-bold text-xs text-[var(--text-secondary)] hover:text-[var(--accent)] active:scale-95 cursor-pointer"
                  title="Reducir interlineado en 0.1"
                  @mousedown.prevent
                  @click="adjustCustomLineHeight(-0.1)"
                >
                  -
                </button>
                <div class="flex items-center gap-1 font-mono text-xs font-bold text-[var(--text-primary)]">
                  <span>{{ customLineHeight.toFixed(2) }}</span>
                  <span class="text-[9px] text-[var(--text-muted)] font-normal">espacio</span>
                </div>
                <button
                  type="button"
                  class="w-6 h-6 rounded neu-btn flex items-center justify-center font-bold text-xs text-[var(--text-secondary)] hover:text-[var(--accent)] active:scale-95 cursor-pointer"
                  title="Aumentar interlineado en 0.1"
                  @mousedown.prevent
                  @click="adjustCustomLineHeight(0.1)"
                >
                  +
                </button>
              </div>

              <!-- Opciones predefinidas -->
              <div class="grid grid-cols-2 gap-1">
                <button
                  v-for="preset in lineHeightPresets"
                  :key="preset.value"
                  type="button"
                  class="flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-all cursor-pointer text-left"
                  :class="
                    currentLineHeight === preset.value
                      ? 'neu-well text-[var(--accent)] font-bold'
                      : 'hover:bg-[var(--bg-base)] text-[var(--text-primary)]'
                  "
                  :title="preset.description"
                  @mousedown.prevent
                  @click="applyLineHeight(preset.value)"
                >
                  <span class="font-mono font-semibold">{{ preset.value }}</span>
                  <span class="text-[10px] text-[var(--text-muted)] truncate ml-1">{{ preset.label.split(' ')[1] }}</span>
                </button>
              </div>

              <!-- Separación entre párrafos (Margen) -->
              <div class="pt-1 border-t border-[var(--groove-dark)]/30 flex flex-col gap-1">
                <div class="text-[9px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                  Separación de Párrafos
                </div>
                <div class="grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    class="py-1 px-1.5 rounded text-[10px] font-medium text-center transition-all cursor-pointer"
                    :class="currentParagraphGap === 'compact' ? 'neu-well text-[var(--accent)] font-bold' : 'neu-btn text-[var(--text-secondary)]'"
                    title="Separación compacta entre párrafos (0.65rem)"
                    @mousedown.prevent
                    @click="setParagraphGap('compact')"
                  >
                    Compacto
                  </button>
                  <button
                    type="button"
                    class="py-1 px-1.5 rounded text-[10px] font-medium text-center transition-all cursor-pointer"
                    :class="currentParagraphGap === 'normal' ? 'neu-well text-[var(--accent)] font-bold' : 'neu-btn text-[var(--text-secondary)]'"
                    title="Separación estándar entre párrafos (1.25rem)"
                    @mousedown.prevent
                    @click="setParagraphGap('normal')"
                  >
                    Estándar
                  </button>
                  <button
                    type="button"
                    class="py-1 px-1.5 rounded text-[10px] font-medium text-center transition-all cursor-pointer"
                    :class="currentParagraphGap === 'relaxed' ? 'neu-well text-[var(--accent)] font-bold' : 'neu-btn text-[var(--text-secondary)]'"
                    title="Separación amplia entre párrafos (1.85rem)"
                    @mousedown.prevent
                    @click="setParagraphGap('relaxed')"
                  >
                    Amplio
                  </button>
                </div>
              </div>

              <!-- Acciones de ámbito -->
              <div class="pt-1 border-t border-[var(--groove-dark)]/30 flex items-center justify-between gap-1 text-[10px]">
                <button
                  type="button"
                  class="px-2 py-1 rounded neu-btn text-[var(--text-secondary)] hover:text-[var(--accent)] transition-all cursor-pointer flex-1 text-center font-medium"
                  title="Aplicar el interlineado actual a todos los párrafos del capítulo activo"
                  @mousedown.prevent
                  @click="applyLineHeightToChapter(String(customLineHeight))"
                >
                  A todo el capítulo
                </button>
                <button
                  type="button"
                  class="px-1.5 py-1 rounded hover:text-rose-500 text-[var(--text-muted)] transition-all cursor-pointer"
                  title="Restablecer interlineado predeterminado"
                  @mousedown.prevent
                  @click="resetLineHeight"
                >
                  Restablecer
                </button>
              </div>
            </div>
          </Transition>
        </Teleport>
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
        <div ref="bulletTriggerRef" class="relative flex items-center">
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
          <Teleport to="body">
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
                ref="bulletPopoverRef"
                class="fixed z-[9999] neu-surface p-2 min-w-[210px] shadow-2xl rounded-xl border border-[var(--groove-dark)]/60 backdrop-blur-lg bg-[var(--bg-surface)] flex flex-col gap-1"
                @click.stop
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
          </Teleport>
        </div>

        <!-- Lista numerada con selector de formato -->
        <div ref="orderedTriggerRef" class="relative flex items-center">
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
          <Teleport to="body">
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
                ref="orderedPopoverRef"
                class="fixed z-[9999] neu-surface p-2 min-w-[230px] shadow-2xl rounded-xl border border-[var(--groove-dark)]/60 backdrop-blur-lg bg-[var(--bg-surface)] flex flex-col gap-1"
                @click.stop
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
          </Teleport>
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

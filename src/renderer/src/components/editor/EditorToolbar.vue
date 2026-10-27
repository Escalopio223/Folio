<script setup lang="ts">
import { ref } from 'vue'
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

const props = defineProps<{
  editor: Editor | null | undefined
}>()

// Estado de los popovers / dropdowns
const isFontFamilyOpen = ref(false)
const isFontSizeOpen = ref(false)
const isColorPickerOpen = ref(false)
const isHighlightPickerOpen = ref(false)

const fontDropdownRef = ref<HTMLElement | null>(null)
const sizeDropdownRef = ref<HTMLElement | null>(null)
const colorPickerRef = ref<HTMLElement | null>(null)
const highlightPickerRef = ref<HTMLElement | null>(null)

onClickOutside(fontDropdownRef, () => {
  isFontFamilyOpen.value = false
})
onClickOutside(sizeDropdownRef, () => {
  isFontSizeOpen.value = false
})
onClickOutside(colorPickerRef, () => {
  isColorPickerOpen.value = false
})
onClickOutside(highlightPickerRef, () => {
  isHighlightPickerOpen.value = false
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
  isFontFamilyOpen.value = false
}

// Tamaños de fuente disponibles
const fontSizes = [
  { label: '14px · Pequeño', value: '14px' },
  { label: '16px · Estándar', value: '16px' },
  { label: '18px · Editorial', value: '18px' },
  { label: '20px · Lectura', value: '20px' },
  { label: '24px · Subtítulo', value: '24px' },
  { label: '28px · Título', value: '28px' },
  { label: '32px · Gran Titular', value: '32px' },
  { label: 'Por Defecto', value: '' }
]

function selectFontSize(sizeValue: string): void {
  if (!props.editor) return
  if (!sizeValue) {
    props.editor.chain().focus().unsetFontSize().run()
  } else {
    props.editor.chain().focus().setFontSize(sizeValue).run()
  }
  isFontSizeOpen.value = false
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
  isColorPickerOpen.value = false
}

function resetColor(): void {
  if (!props.editor) return
  props.editor.chain().focus().unsetColor().run()
  isColorPickerOpen.value = false
}

// Paleta de resaltadores suaves
const highlightColors = [
  { label: 'Amarillo Pastel', value: '#FEF08A', dot: 'bg-yellow-200' },
  { label: 'Terracota Suave', value: '#FED7AA', dot: 'bg-orange-200' },
  { label: 'Verde Menta', value: '#BBF7D0', dot: 'bg-green-200' },
  { label: 'Celeste Papel', value: '#BAE6FD', dot: 'bg-sky-200' },
  { label: 'Lavanda Cálido', value: '#E9D5FF', dot: 'bg-purple-200' }
]

function selectHighlight(color: string): void {
  if (!props.editor) return
  props.editor.chain().focus().toggleHighlight({ color }).run()
  isHighlightPickerOpen.value = false
}

function resetHighlight(): void {
  if (!props.editor) return
  props.editor.chain().focus().unsetHighlight().run()
  isHighlightPickerOpen.value = false
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
    class="editor-toolbar w-full neu-surface px-2.5 py-1.5 flex items-center gap-1 text-xs select-none border-b border-[var(--groove-dark)]/30 backdrop-blur-md overflow-x-auto editorial-scrollbar transition-all"
  >
    <!-- 1. Deshacer / Rehacer -->
    <div class="flex items-center gap-0.5 shrink-0">
      <button
        type="button"
        class="neu-btn w-7 h-7 flex items-center justify-center transition-all cursor-pointer text-[var(--text-secondary)] disabled:opacity-35 disabled:cursor-not-allowed hover:text-[var(--text-primary)]"
        :disabled="!editor?.can().undo()"
        title="Deshacer (Ctrl+Z)"
        @click="editor?.chain().focus().undo().run()"
      >
        <Undo :size="13" />
      </button>

      <button
        type="button"
        class="neu-btn w-7 h-7 flex items-center justify-center transition-all cursor-pointer text-[var(--text-secondary)] disabled:opacity-35 disabled:cursor-not-allowed hover:text-[var(--text-primary)]"
        :disabled="!editor?.can().redo()"
        title="Rehacer (Ctrl+Y)"
        @click="editor?.chain().focus().redo().run()"
      >
        <Redo :size="13" />
      </button>
    </div>

    <div class="neu-groove-v h-4 my-auto shrink-0 mx-1"></div>

    <!-- 2. Selector de Fuente Tipográfica -->
    <div ref="fontDropdownRef" class="relative shrink-0">
      <button
        type="button"
        class="neu-btn px-2 h-7 flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
        :class="{ 'neu-well !text-[var(--accent)] font-semibold': isFontFamilyOpen }"
        title="Cambiar familia de fuente"
        @click="isFontFamilyOpen = !isFontFamilyOpen"
      >
        <Type :size="13" />
        <span class="text-[11px] font-medium hidden sm:inline">Fuente</span>
        <ChevronDown :size="11" class="opacity-70" />
      </button>

      <!-- Dropdown Fuentes -->
      <Transition
        enter-active-class="transition duration-100 ease-out"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition duration-75 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-if="isFontFamilyOpen"
          class="absolute left-0 top-full mt-1.5 z-50 neu-surface p-1 min-w-[170px] shadow-2xl rounded-xl border border-[var(--groove-dark)]/50 backdrop-blur-md"
        >
          <button
            v-for="font in fontFamilies"
            :key="font.label"
            type="button"
            class="w-full px-2.5 py-1.5 rounded-lg text-left text-xs flex items-center justify-between hover:bg-[var(--bg-base)] transition-colors cursor-pointer text-[var(--text-primary)]"
            :class="font.preview"
            @click="selectFontFamily(font.value)"
          >
            <span>{{ font.label }}</span>
          </button>
        </div>
      </Transition>
    </div>

    <!-- 3. Selector de Tamaño de Letra -->
    <div ref="sizeDropdownRef" class="relative shrink-0">
      <button
        type="button"
        class="neu-btn px-2 h-7 flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
        :class="{ 'neu-well !text-[var(--accent)] font-semibold': isFontSizeOpen }"
        title="Cambiar tamaño de letra"
        @click="isFontSizeOpen = !isFontSizeOpen"
      >
        <span class="text-[11px] font-mono font-medium">T</span>
        <span class="text-[11px] font-medium hidden sm:inline">Tamaño</span>
        <ChevronDown :size="11" class="opacity-70" />
      </button>

      <!-- Dropdown Tamaños -->
      <Transition
        enter-active-class="transition duration-100 ease-out"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition duration-75 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-if="isFontSizeOpen"
          class="absolute left-0 top-full mt-1.5 z-50 neu-surface p-1 min-w-[155px] shadow-2xl rounded-xl border border-[var(--groove-dark)]/50 backdrop-blur-md"
        >
          <button
            v-for="size in fontSizes"
            :key="size.label"
            type="button"
            class="w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-mono hover:bg-[var(--bg-base)] transition-colors cursor-pointer text-[var(--text-primary)]"
            @click="selectFontSize(size.value)"
          >
            <span>{{ size.label }}</span>
          </button>
        </div>
      </Transition>
    </div>

    <div class="neu-groove-v h-4 my-auto shrink-0 mx-1"></div>

    <!-- 4. Jerarquía / Encabezados -->
    <div class="flex items-center gap-0.5 shrink-0">
      <button
        type="button"
        class="neu-btn w-7 h-7 flex items-center justify-center transition-all cursor-pointer text-[var(--text-secondary)]"
        :class="{ 'neu-well !text-[var(--accent)] font-bold': editor?.isActive('paragraph') && !editor?.isActive('heading') }"
        title="Párrafo normal"
        @click="editor?.chain().focus().setParagraph().run()"
      >
        <Pilcrow :size="13" />
      </button>

      <button
        type="button"
        class="neu-btn w-7 h-7 flex items-center justify-center transition-all cursor-pointer text-[var(--text-secondary)]"
        :class="{ 'neu-well !text-[var(--accent)] font-bold': editor?.isActive('heading', { level: 1 }) }"
        title="Encabezado 1 (Título)"
        @click="editor?.chain().focus().toggleHeading({ level: 1 }).run()"
      >
        <Heading1 :size="13" />
      </button>

      <button
        type="button"
        class="neu-btn w-7 h-7 flex items-center justify-center transition-all cursor-pointer text-[var(--text-secondary)]"
        :class="{ 'neu-well !text-[var(--accent)] font-bold': editor?.isActive('heading', { level: 2 }) }"
        title="Encabezado 2 (Subtítulo de escena)"
        @click="editor?.chain().focus().toggleHeading({ level: 2 }).run()"
      >
        <Heading2 :size="13" />
      </button>

      <button
        type="button"
        class="neu-btn w-7 h-7 flex items-center justify-center transition-all cursor-pointer text-[var(--text-secondary)]"
        :class="{ 'neu-well !text-[var(--accent)] font-bold': editor?.isActive('heading', { level: 3 }) }"
        title="Encabezado 3 (Sección)"
        @click="editor?.chain().focus().toggleHeading({ level: 3 }).run()"
      >
        <Heading3 :size="13" />
      </button>

      <button
        type="button"
        class="neu-btn w-7 h-7 flex items-center justify-center transition-all cursor-pointer text-[var(--text-secondary)]"
        :class="{ 'neu-well !text-[var(--accent)] font-bold': editor?.isActive('blockquote') }"
        title="Cita en bloque editorial"
        @click="editor?.chain().focus().toggleBlockquote().run()"
      >
        <Quote :size="13" />
      </button>
    </div>

    <div class="neu-groove-v h-4 my-auto shrink-0 mx-1"></div>

    <!-- 5. Formato Enriquecido Básico: Negrita, Cursiva, Subrayado, Tachado -->
    <div class="flex items-center gap-0.5 shrink-0">
      <button
        type="button"
        class="neu-btn w-7 h-7 flex items-center justify-center transition-all cursor-pointer text-[var(--text-secondary)]"
        :class="{ 'neu-well !text-[var(--accent)] font-bold': editor?.isActive('bold') }"
        title="Negrita (Ctrl+B)"
        @click="editor?.chain().focus().toggleBold().run()"
      >
        <Bold :size="13" />
      </button>

      <button
        type="button"
        class="neu-btn w-7 h-7 flex items-center justify-center transition-all cursor-pointer text-[var(--text-secondary)]"
        :class="{ 'neu-well !text-[var(--accent)] font-bold': editor?.isActive('italic') }"
        title="Cursiva (Ctrl+I)"
        @click="editor?.chain().focus().toggleItalic().run()"
      >
        <Italic :size="13" />
      </button>

      <button
        type="button"
        class="neu-btn w-7 h-7 flex items-center justify-center transition-all cursor-pointer text-[var(--text-secondary)]"
        :class="{ 'neu-well !text-[var(--accent)] font-bold': editor?.isActive('underline') }"
        title="Subrayado (Ctrl+U)"
        @click="editor?.chain().focus().toggleUnderline().run()"
      >
        <Underline :size="13" />
      </button>

      <button
        type="button"
        class="neu-btn w-7 h-7 flex items-center justify-center transition-all cursor-pointer text-[var(--text-secondary)]"
        :class="{ 'neu-well !text-[var(--accent)] font-bold': editor?.isActive('strike') }"
        title="Tachado (Ctrl+Shift+X)"
        @click="editor?.chain().focus().toggleStrike().run()"
      >
        <Strikethrough :size="13" />
      </button>
    </div>

    <div class="neu-groove-v h-4 my-auto shrink-0 mx-1"></div>

    <!-- 6. Color de Fuente & Resaltador -->
    <div class="flex items-center gap-0.5 shrink-0">
      <!-- Selector de Color -->
      <div ref="colorPickerRef" class="relative">
        <button
          type="button"
          class="neu-btn px-2 h-7 flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
          :class="{ 'neu-well !text-[var(--accent)] font-semibold': isColorPickerOpen }"
          title="Color de texto"
          @click="isColorPickerOpen = !isColorPickerOpen"
        >
          <Baseline :size="13" class="text-[var(--accent)]" />
          <span class="text-[11px] font-medium hidden md:inline">Color</span>
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
            v-if="isColorPickerOpen"
            class="absolute left-0 top-full mt-1.5 z-50 neu-surface p-2.5 min-w-[190px] shadow-2xl rounded-xl border border-[var(--groove-dark)]/50 backdrop-blur-md flex flex-col gap-2"
          >
            <div class="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider mb-1">
              Color de Texto
            </div>

            <div class="grid grid-cols-4 gap-1.5">
              <button
                v-for="color in textColors"
                :key="color.value"
                type="button"
                class="w-6 h-6 rounded-full border border-black/10 transition-transform hover:scale-110 active:scale-95 shadow-sm cursor-pointer"
                :style="{ backgroundColor: color.value }"
                :title="color.label"
                @click="selectColor(color.value)"
              ></button>
            </div>

            <div class="neu-groove-h my-1"></div>

            <button
              type="button"
              class="w-full px-2 py-1 rounded text-left text-xs flex items-center gap-2 hover:bg-[var(--bg-base)] text-[var(--text-secondary)] transition-colors cursor-pointer"
              @click="resetColor"
            >
              <RotateCcw :size="11" />
              <span>Restablecer color base</span>
            </button>
          </div>
        </Transition>
      </div>

      <!-- Selector de Resaltado -->
      <div ref="highlightPickerRef" class="relative">
        <button
          type="button"
          class="neu-btn px-2 h-7 flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
          :class="{ 'neu-well !text-[var(--accent)] font-semibold': isHighlightPickerOpen || editor?.isActive('highlight') }"
          title="Resaltar texto"
          @click="isHighlightPickerOpen = !isHighlightPickerOpen"
        >
          <Highlighter :size="13" />
          <span class="text-[11px] font-medium hidden md:inline">Resaltar</span>
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
            v-if="isHighlightPickerOpen"
            class="absolute left-0 top-full mt-1.5 z-50 neu-surface p-2.5 min-w-[180px] shadow-2xl rounded-xl border border-[var(--groove-dark)]/50 backdrop-blur-md flex flex-col gap-2"
          >
            <div class="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider mb-1">
              Color de Resaltado
            </div>

            <div class="flex items-center gap-1.5">
              <button
                v-for="h in highlightColors"
                :key="h.value"
                type="button"
                class="w-6 h-6 rounded-md border border-black/10 transition-transform hover:scale-110 active:scale-95 shadow-sm cursor-pointer"
                :style="{ backgroundColor: h.value }"
                :title="h.label"
                @click="selectHighlight(h.value)"
              ></button>
            </div>

            <div class="neu-groove-h my-1"></div>

            <button
              type="button"
              class="w-full px-2 py-1 rounded text-left text-xs flex items-center gap-2 hover:bg-[var(--bg-base)] text-[var(--text-secondary)] transition-colors cursor-pointer"
              @click="resetHighlight"
            >
              <RotateCcw :size="11" />
              <span>Quitar resaltado</span>
            </button>
          </div>
        </Transition>
      </div>
    </div>

    <div class="neu-groove-v h-4 my-auto shrink-0 mx-1"></div>

    <!-- 7. Alineación de Texto -->
    <div class="flex items-center gap-0.5 shrink-0">
      <button
        type="button"
        class="neu-btn w-7 h-7 flex items-center justify-center transition-all cursor-pointer text-[var(--text-secondary)]"
        :class="{ 'neu-well !text-[var(--accent)] font-bold': editor?.isActive({ textAlign: 'left' }) }"
        title="Alinear a la izquierda"
        @click="editor?.chain().focus().setTextAlign('left').run()"
      >
        <AlignLeft :size="13" />
      </button>

      <button
        type="button"
        class="neu-btn w-7 h-7 flex items-center justify-center transition-all cursor-pointer text-[var(--text-secondary)]"
        :class="{ 'neu-well !text-[var(--accent)] font-bold': editor?.isActive({ textAlign: 'center' }) }"
        title="Centrar texto"
        @click="editor?.chain().focus().setTextAlign('center').run()"
      >
        <AlignCenter :size="13" />
      </button>

      <button
        type="button"
        class="neu-btn w-7 h-7 flex items-center justify-center transition-all cursor-pointer text-[var(--text-secondary)]"
        :class="{ 'neu-well !text-[var(--accent)] font-bold': editor?.isActive({ textAlign: 'justify' }) }"
        title="Justificar texto"
        @click="editor?.chain().focus().setTextAlign('justify').run()"
      >
        <AlignJustify :size="13" />
      </button>

      <button
        type="button"
        class="neu-btn w-7 h-7 flex items-center justify-center transition-all cursor-pointer text-[var(--text-secondary)]"
        :class="{ 'neu-well !text-[var(--accent)] font-bold': editor?.isActive({ textAlign: 'right' }) }"
        title="Alinear a la derecha"
        @click="editor?.chain().focus().setTextAlign('right').run()"
      >
        <AlignRight :size="13" />
      </button>
    </div>

    <div class="neu-groove-v h-4 my-auto shrink-0 mx-1"></div>

    <!-- 8. Tabulación & Sangría -->
    <div class="flex items-center gap-1 shrink-0">
      <!-- Botón Tabular 2 Espacios -->
      <button
        type="button"
        class="neu-btn px-2 h-7 flex items-center gap-1 text-[11px] font-mono transition-all cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        title="Insertar Tabulación (2 espacios)"
        @click="insertTabSpaces"
      >
        <span class="font-bold">⇥</span>
        <span class="text-[10px] hidden sm:inline">Tab</span>
      </button>

      <!-- Aumentar Sangría -->
      <button
        type="button"
        class="neu-btn w-7 h-7 flex items-center justify-center transition-all cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        title="Aumentar Sangría de Párrafo"
        @click="handleIndent"
      >
        <IndentIncrease :size="13" />
      </button>

      <!-- Disminuir Sangría -->
      <button
        type="button"
        class="neu-btn w-7 h-7 flex items-center justify-center transition-all cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        title="Disminuir Sangría de Párrafo (Shift+Tab)"
        @click="handleOutdent"
      >
        <IndentDecrease :size="13" />
      </button>
    </div>

    <div class="neu-groove-v h-4 my-auto shrink-0 mx-1"></div>

    <!-- 9. Listas & Florón Narrativo Clásico -->
    <div class="flex items-center gap-1 shrink-0">
      <button
        type="button"
        class="neu-btn w-7 h-7 flex items-center justify-center transition-all cursor-pointer text-[var(--text-secondary)]"
        :class="{ 'neu-well !text-[var(--accent)] font-bold': editor?.isActive('bulletList') }"
        title="Lista con viñetas"
        @click="editor?.chain().focus().toggleBulletList().run()"
      >
        <List :size="13" />
      </button>

      <button
        type="button"
        class="neu-btn w-7 h-7 flex items-center justify-center transition-all cursor-pointer text-[var(--text-secondary)]"
        :class="{ 'neu-well !text-[var(--accent)] font-bold': editor?.isActive('orderedList') }"
        title="Lista numerada"
        @click="editor?.chain().focus().toggleOrderedList().run()"
      >
        <ListOrdered :size="13" />
      </button>

      <!-- Florón Narrativo de Escena (* * *) Destacado -->
      <button
        type="button"
        class="neu-btn px-2.5 h-7 flex items-center gap-1.5 transition-all cursor-pointer font-bold text-[var(--accent)] hover:!text-[var(--accent-hover)] bg-[var(--accent)]/5 hover:bg-[var(--accent)]/10 border border-[var(--accent)]/30 rounded-lg shadow-sm"
        title="Añadir Florón de Corte Narrativo (* * *)"
        @click="insertSceneBreak"
      >
        <span class="font-mono text-xs tracking-widest leading-none">* * *</span>
        <span class="text-[10px] font-sans font-medium hidden xl:inline">Florón</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.editor-toolbar {
  scrollbar-width: thin;
  scrollbar-color: var(--groove-dark) transparent;
}
</style>

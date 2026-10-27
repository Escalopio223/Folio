<script setup lang="ts">
import { BubbleMenu } from '@tiptap/vue-3/menus'
import type { Editor } from '@tiptap/vue-3'
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading2,
  Quote
} from 'lucide-vue-next'
import { setHeadingSmart, setBlockquoteSmart } from './utils/blockFormatting'

defineProps<{
  editor: Editor | null | undefined
}>()
</script>

<template>
  <BubbleMenu
    v-if="editor"
    :editor="editor"
    :options="{
      placement: 'top',
      offset: 10
    }"
    class="neu-surface p-1.5 flex items-center gap-1 shadow-2xl rounded-xl border border-[var(--groove-light)] backdrop-blur-md select-none z-50"
  >
    <!-- Negrita -->
    <button
      type="button"
      class="neu-btn w-7 h-7 flex items-center justify-center text-xs transition-all cursor-pointer"
      :class="{ 'neu-well !text-[var(--accent)] font-bold': editor.isActive('bold') }"
      title="Negrita (Ctrl+B)"
      @click="editor.chain().focus().toggleBold().run()"
    >
      <Bold :size="13" />
    </button>

    <!-- Cursiva -->
    <button
      type="button"
      class="neu-btn w-7 h-7 flex items-center justify-center text-xs transition-all cursor-pointer"
      :class="{ 'neu-well !text-[var(--accent)] font-bold': editor.isActive('italic') }"
      title="Cursiva (Ctrl+I)"
      @click="editor.chain().focus().toggleItalic().run()"
    >
      <Italic :size="13" />
    </button>

    <!-- Subrayado -->
    <button
      type="button"
      class="neu-btn w-7 h-7 flex items-center justify-center text-xs transition-all cursor-pointer"
      :class="{ 'neu-well !text-[var(--accent)] font-bold': editor.isActive('underline') }"
      title="Subrayado (Ctrl+U)"
      @click="editor.chain().focus().toggleUnderline().run()"
    >
      <Underline :size="13" />
    </button>

    <!-- Tachado -->
    <button
      type="button"
      class="neu-btn w-7 h-7 flex items-center justify-center text-xs transition-all cursor-pointer"
      :class="{ 'neu-well !text-[var(--accent)] font-bold': editor.isActive('strike') }"
      title="Tachado (Ctrl+Shift+X)"
      @click="editor.chain().focus().toggleStrike().run()"
    >
      <Strikethrough :size="13" />
    </button>

    <div class="neu-groove-v h-4 my-auto"></div>

    <!-- H2 -->
    <button
      type="button"
      class="neu-btn px-2 h-7 flex items-center justify-center text-xs transition-all cursor-pointer font-bold"
      :class="{ 'neu-well !text-[var(--accent)]': editor.isActive('heading', { level: 2 }) }"
      title="Subtítulo H2"
      @click="setHeadingSmart(editor, 2)"
    >
      <Heading2 :size="13" />
    </button>

    <!-- Cita en bloque -->
    <button
      type="button"
      class="neu-btn w-7 h-7 flex items-center justify-center text-xs transition-all cursor-pointer"
      :class="{ 'neu-well !text-[var(--accent)]': editor.isActive('blockquote') }"
      title="Cita en bloque"
      @click="setBlockquoteSmart(editor)"
    >
      <Quote :size="13" />
    </button>

    <!-- Descanso de Escena (Scene Break) -->
    <button
      type="button"
      class="neu-btn px-2 h-7 flex items-center justify-center text-[10px] font-mono font-bold tracking-widest text-[var(--accent)] transition-all cursor-pointer"
      title="Descanso de Escena (* * *)"
      @click="editor.chain().focus().setSceneBreak().run()"
    >
      <span>* * *</span>
    </button>
  </BubbleMenu>
</template>

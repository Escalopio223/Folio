<script setup lang="ts">
import { ref } from 'vue'
import { BookOpen, X, Plus } from 'lucide-vue-next'
import { useProjectStore } from '../stores/projectStore'

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'created', projectId: string): void
}>()

const projectStore = useProjectStore()
const title = ref('')
const synopsis = ref('')
const genre = ref('')
const isSubmitting = ref(false)

async function handleSubmit(): Promise<void> {
  if (!title.value.trim()) return
  try {
    isSubmitting.value = true
    const created = await projectStore.createProject({
      title: title.value.trim(),
      synopsis: synopsis.value.trim(),
      genre: genre.value.trim()
    })
    if (created) {
      emit('created', created.id)
      emit('close')
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none">
    <div class="neu-surface p-6 max-w-md w-full space-y-5 relative">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg neu-well-sm flex items-center justify-center text-[var(--accent)]">
            <BookOpen :size="16" />
          </div>
          <div>
            <h3 class="font-editorial text-lg font-bold text-[var(--text-primary)]">
              Nuevo Proyecto / Libro
            </h3>
            <p class="text-[11px] text-[var(--text-muted)] font-mono">
              Comienza un nuevo manuscrito con su propia wiki de mundo
            </p>
          </div>
        </div>

        <button
          type="button"
          class="neu-btn p-1.5 text-[var(--text-muted)] hover:!text-[var(--accent)]"
          @click="emit('close')"
        >
          <X :size="14" />
        </button>
      </div>

      <div class="neu-groove-h"></div>

      <!-- Form -->
      <form class="space-y-4 text-xs" @submit.prevent="handleSubmit">
        <div class="space-y-1">
          <label class="block font-medium text-[var(--text-secondary)]">Título del Libro *</label>
          <input
            v-model="title"
            type="text"
            placeholder="ej. Las Crónicas de Oakhaven"
            class="w-full neu-well-sm px-3 py-2 bg-transparent border-none text-[var(--text-primary)] focus:outline-none placeholder:text-[var(--text-muted)]"
            required
            autofocus
          />
        </div>

        <div class="space-y-1">
          <label class="block font-medium text-[var(--text-secondary)]">Género literario</label>
          <input
            v-model="genre"
            type="text"
            placeholder="ej. Fantasía Épica, Thriller, Ficción Histórica..."
            class="w-full neu-well-sm px-3 py-2 bg-transparent border-none text-[var(--text-primary)] focus:outline-none placeholder:text-[var(--text-muted)]"
          />
        </div>

        <div class="space-y-1">
          <label class="block font-medium text-[var(--text-secondary)]">Sinopsis / Premisa</label>
          <textarea
            v-model="synopsis"
            rows="3"
            placeholder="Breve resumen del conflicto o idea central de la obra..."
            class="w-full neu-well-sm p-3 bg-transparent border-none text-[var(--text-primary)] focus:outline-none placeholder:text-[var(--text-muted)] resize-none"
          ></textarea>
        </div>

        <div class="neu-groove-h"></div>

        <!-- Buttons -->
        <div class="flex items-center justify-end gap-2.5 pt-1">
          <button
            type="button"
            class="neu-btn px-4 py-2 text-xs"
            @click="emit('close')"
          >
            Cancelar
          </button>

          <button
            type="submit"
            class="neu-btn-terracotta px-5 py-2 text-xs flex items-center gap-1.5"
            :disabled="isSubmitting || !title.trim()"
          >
            <Plus :size="14" />
            <span>Crear Proyecto</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

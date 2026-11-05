<script setup lang="ts">
import { ref, watch } from 'vue'
import { BookOpen, X, Plus, Check, Pencil } from 'lucide-vue-next'
import { useProjectStore } from '../stores/projectStore'
import type { Project } from '@shared/types'

const props = withDefaults(
  defineProps<{
    mode?: 'create' | 'edit'
    project?: Project | null
  }>(),
  {
    mode: 'create',
    project: null
  }
)

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'created', projectId: string): void
  (e: 'updated', project: Project): void
}>()

const projectStore = useProjectStore()
const title = ref('')
const synopsis = ref('')
const genre = ref('')
const isSubmitting = ref(false)

// Sincronizar campos con los datos iniciales según el modo
watch(
  () => props.project,
  (p) => {
    if (props.mode === 'edit' && p) {
      title.value = p.title || ''
      genre.value = p.genre || ''
      synopsis.value = p.synopsis || ''
    } else if (props.mode === 'create') {
      title.value = ''
      genre.value = ''
      synopsis.value = ''
    }
  },
  { immediate: true }
)

async function handleSubmit(): Promise<void> {
  const cleanTitle = title.value.trim()
  if (!cleanTitle) return

  try {
    isSubmitting.value = true

    if (props.mode === 'edit' && props.project) {
      const updated = await projectStore.updateProject({
        id: props.project.id,
        title: cleanTitle,
        genre: genre.value.trim(),
        synopsis: synopsis.value.trim()
      })
      if (updated) {
        emit('updated', updated)
        emit('close')
      }
    } else {
      const created = await projectStore.createProject({
        title: cleanTitle,
        genre: genre.value.trim(),
        synopsis: synopsis.value.trim()
      })
      if (created) {
        emit('created', created.id)
        emit('close')
      }
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
            <Pencil v-if="mode === 'edit'" :size="16" />
            <BookOpen v-else :size="16" />
          </div>
          <div>
            <h3 class="font-editorial text-lg font-bold text-[var(--text-primary)]">
              {{ mode === 'edit' ? 'Editar Libro' : 'Nuevo Proyecto / Libro' }}
            </h3>
            <p class="text-[11px] text-[var(--text-muted)] font-mono">
              {{
                mode === 'edit'
                  ? 'Modifica el título, género y sinopsis de la obra'
                  : 'Comienza un nuevo manuscrito con su propia wiki de mundo'
              }}
            </p>
          </div>
        </div>

        <button
          type="button"
          class="neu-btn p-1.5 text-[var(--text-muted)] hover:!text-[var(--accent)] cursor-pointer"
          @click="emit('close')"
        >
          <X :size="14" />
        </button>
      </div>

      <div class="neu-groove-h"></div>

      <!-- Form -->
      <form class="space-y-4 text-xs" @submit.prevent="handleSubmit">
        <div class="space-y-1">
          <label class="block font-medium text-[var(--text-secondary)]">
            Título / Nombre del Libro *
          </label>
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
            class="neu-btn px-4 py-2 text-xs cursor-pointer"
            @click="emit('close')"
          >
            Cancelar
          </button>

          <button
            type="submit"
            class="neu-btn-terracotta px-5 py-2 text-xs flex items-center gap-1.5 cursor-pointer"
            :disabled="isSubmitting || !title.trim()"
          >
            <Check v-if="mode === 'edit'" :size="14" />
            <Plus v-else :size="14" />
            <span>{{ mode === 'edit' ? 'Guardar Cambios' : 'Crear Proyecto' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
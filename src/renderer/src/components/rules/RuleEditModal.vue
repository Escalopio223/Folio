<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import {
  X,
  Pin,
  Sparkles,
  AlertTriangle,
  BookOpen,
  Tag,
  Check,
  Scale
} from 'lucide-vue-next'
import { useRulesStore } from '../../stores/rulesStore'
import { useProjectStore } from '../../stores/projectStore'
import { getPresetsForGenre } from '../../utils/rulePresets'

const rulesStore = useRulesStore()
const projectStore = useProjectStore()

const titleInputRef = ref<HTMLInputElement | null>(null)

// Campos reactivos del formulario
const formTitle = ref('')
const formCategory = ref('')
const formAxiom = ref('')
const formLimitations = ref('')
const formDetails = ref('')
const formIsPinned = ref(false)

const isSaving = ref(false)
const errorMessage = ref<string | null>(null)

// Sugerencias de categorías basadas en categorías existentes + preset de género
const categorySuggestions = computed<string[]>(() => {
  const set = new Set<string>()

  // 1. Categorías ya en uso en el proyecto
  for (const cat of rulesStore.categories) {
    if (cat) set.add(cat)
  }

  // 2. Presets recomendados según el género del proyecto activo
  const genrePreset = getPresetsForGenre(projectStore.activeProject?.genre)
  for (const cat of genrePreset.categories) {
    set.add(cat)
  }

  return Array.from(set).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))
})

// Sincronizar formulario al abrir modal (creación o edición)
watch(
  () => rulesStore.isModalOpen,
  (open) => {
    if (open) {
      errorMessage.value = null
      if (rulesStore.editingRule) {
        // Modo Edición
        formTitle.value = rulesStore.editingRule.title
        formCategory.value = rulesStore.editingRule.category
        formAxiom.value = rulesStore.editingRule.axiom
        formLimitations.value = rulesStore.editingRule.limitations || ''
        formDetails.value = rulesStore.editingRule.details || ''
        formIsPinned.value = rulesStore.editingRule.isPinned
      } else {
        // Modo Creación
        formTitle.value = ''
        formCategory.value = rulesStore.prefilledCategory || rulesStore.categories[0] || categorySuggestions.value[0] || 'Leyes Naturales'
        formAxiom.value = ''
        formLimitations.value = ''
        formDetails.value = ''
        formIsPinned.value = false
      }

      nextTick(() => {
        titleInputRef.value?.focus()
      })
    }
  },
  { immediate: true }
)

function setCategory(cat: string): void {
  formCategory.value = cat
}

async function handleSave(): Promise<void> {
  const title = formTitle.value.trim()
  const category = formCategory.value.trim()
  const axiom = formAxiom.value.trim()

  if (!title) {
    errorMessage.value = 'El título de la regla es obligatorio.'
    return
  }
  if (!category) {
    errorMessage.value = 'Debes especificar una categoría para clasificar la regla.'
    return
  }
  if (!axiom) {
    errorMessage.value = 'El axioma o verdad fundamental no puede estar vacío.'
    return
  }

  if (!projectStore.activeProjectId) {
    errorMessage.value = 'No se encontró un proyecto activo.'
    return
  }

  try {
    isSaving.value = true
    errorMessage.value = null

    await rulesStore.saveRule({
      id: rulesStore.editingRule ? rulesStore.editingRule.id : undefined,
      projectId: projectStore.activeProjectId,
      category,
      title,
      axiom,
      limitations: formLimitations.value.trim() || null,
      details: formDetails.value.trim() || null,
      isPinned: formIsPinned.value
    })

    rulesStore.closeModal()
  } catch (err: unknown) {
    errorMessage.value = err instanceof Error ? err.message : 'Error al guardar la regla en la base de datos.'
  } finally {
    isSaving.value = false
  }
}

function handleKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    rulesStore.closeModal()
  } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    handleSave()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="rulesStore.isModalOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs select-none"
        @click.self="rulesStore.closeModal"
      >
        <div
          class="neu-surface max-w-lg w-full max-h-[90vh] flex flex-col rounded-2xl overflow-hidden border border-[var(--groove-dark)]/60 shadow-2xl bg-[var(--bg-surface)] text-[var(--text-primary)]"
          role="dialog"
          aria-modal="true"
        >
          <!-- Cabecera del Modal -->
          <header class="p-3.5 border-b border-[var(--groove-dark)]/40 flex items-center justify-between shrink-0 bg-[var(--bg-surface)]">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-8 h-8 rounded-xl neu-well flex items-center justify-center text-[var(--accent)] shrink-0">
                <Scale :size="16" class="stroke-[2.2]" />
              </div>
              <div class="min-w-0">
                <h3 class="font-editorial text-sm font-bold text-[var(--text-primary)] truncate">
                  {{ rulesStore.editingRule ? 'Editar Regla del Mundo' : 'Nueva Regla del Mundo' }}
                </h3>
                <p class="text-[10px] text-[var(--text-muted)] truncate">
                  Codifica leyes duras, axiomas y límites inmutables
                </p>
              </div>
            </div>

            <button
              type="button"
              class="w-7 h-7 neu-btn rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all cursor-pointer active:scale-95"
              title="Cerrar modal (Escape)"
              @click="rulesStore.closeModal"
            >
              <X :size="14" />
            </button>
          </header>

          <!-- Cuerpo desplazable del Formulario -->
          <div class="p-4 overflow-y-auto space-y-3.5 editorial-scrollbar text-xs">
            <!-- Mensaje de Error si aplica -->
            <div
              v-if="errorMessage"
              class="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-mono"
            >
              {{ errorMessage }}
            </div>

            <!-- 1. Título de la regla -->
            <div class="space-y-1">
              <label class="block text-[11px] font-mono text-[var(--text-secondary)] font-semibold">
                Título o Denominación de la Ley <span class="text-[var(--accent)]">*</span>
              </label>
              <div class="neu-well-sm rounded-xl px-3 py-1.5 border border-[var(--groove-dark)]/40 focus-within:ring-1 focus-within:ring-[var(--accent)]">
                <input
                  ref="titleInputRef"
                  v-model="formTitle"
                  type="text"
                  placeholder="Ej: Tercera Ley del Éter, Protocolo de Custodia, Juramento de Sangre..."
                  class="w-full bg-transparent border-none outline-none font-editorial font-bold text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]/60 cursor-text select-text"
                />
              </div>
            </div>

            <!-- 2. Categoría Dinámica -->
            <div class="space-y-1.5">
              <div class="flex items-center justify-between">
                <label class="block text-[11px] font-mono text-[var(--text-secondary)] font-semibold">
                  Categoría o Dominio del Sistema <span class="text-[var(--accent)]">*</span>
                </label>
                <span class="text-[10px] text-[var(--text-muted)] font-mono">Texto libre o sugerencias</span>
              </div>

              <!-- Input libre de categoría -->
              <div class="neu-well-sm rounded-xl px-3 py-1.5 border border-[var(--groove-dark)]/40 focus-within:ring-1 focus-within:ring-[var(--accent)] flex items-center gap-2">
                <Tag :size="12" class="text-[var(--accent)] shrink-0" />
                <input
                  v-model="formCategory"
                  type="text"
                  placeholder="Ej: Sistemas de Magia, Leyes Penales, Etiqueta, Tecnología..."
                  class="w-full bg-transparent border-none outline-none font-sans text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)]/60 cursor-text select-text"
                />
              </div>

              <!-- Chips sugeridos rápidos -->
              <div class="flex items-center gap-1.5 overflow-x-auto editorial-scrollbar pb-1 pt-0.5 text-[10px]">
                <span class="text-[9px] font-mono text-[var(--text-muted)] shrink-0">Sugerencias:</span>
                <button
                  v-for="cat in categorySuggestions"
                  :key="cat"
                  type="button"
                  class="neu-btn px-2 py-0.5 rounded-lg whitespace-nowrap cursor-pointer transition-all shrink-0 active:scale-95"
                  :class="formCategory.trim().toLowerCase() === cat.toLowerCase() ? 'neu-well font-bold text-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'"
                  @click="setCategory(cat)"
                >
                  {{ cat }}
                </button>
              </div>
            </div>

            <!-- 3. Axioma / Verdad Fundamental (1-2 frases) -->
            <div class="space-y-1">
              <div class="flex items-center justify-between">
                <label class="flex items-center gap-1 text-[11px] font-mono text-[var(--text-secondary)] font-semibold">
                  <Sparkles :size="11" class="text-[var(--accent)]" />
                  <span>Axioma Central (Verdad Fundamental) <span class="text-[var(--accent)]">*</span></span>
                </label>
                <span class="text-[10px] text-[var(--text-muted)] font-mono">1 o 2 frases contundentes</span>
              </div>
              <div class="neu-well rounded-xl p-2.5 border border-[var(--groove-dark)]/40 focus-within:ring-1 focus-within:ring-[var(--accent)]">
                <textarea
                  v-model="formAxiom"
                  rows="2"
                  placeholder="Ej: «Para obtener algo de valor alquímico, debe sacrificarse una sustancia de idéntica masa y carga espiritual.»"
                  class="w-full bg-transparent resize-none border-none outline-none font-editorial italic text-xs leading-relaxed text-[var(--text-primary)] placeholder-[var(--text-muted)]/60 cursor-text select-text"
                />
              </div>
            </div>

            <!-- 4. Limitaciones / Costes / Consecuencias -->
            <div class="space-y-1">
              <div class="flex items-center justify-between">
                <label class="flex items-center gap-1 text-[11px] font-mono text-[var(--accent)] font-semibold">
                  <AlertTriangle :size="11" />
                  <span>Costes, Tabúes & Consecuencias</span>
                </label>
                <span class="text-[10px] text-[var(--text-muted)] font-mono">Qué ocurre al transgredirla</span>
              </div>
              <div class="neu-well-sm rounded-xl p-2.5 border-l-3 border-[var(--accent)] border border-[var(--groove-dark)]/40 focus-within:ring-1 focus-within:ring-[var(--accent)]">
                <textarea
                  v-model="formLimitations"
                  rows="2"
                  placeholder="Ej: Transmutar materia viva destruye el sistema nervioso del mago. Negarse al duelo anula los títulos feudales..."
                  class="w-full bg-transparent resize-none border-none outline-none font-sans text-xs leading-relaxed text-[var(--text-primary)] placeholder-[var(--text-muted)]/60 cursor-text select-text"
                />
              </div>
            </div>

            <!-- 5. Detalles profundos, precedentes y excepciones (Markdown) -->
            <div class="space-y-1">
              <label class="flex items-center gap-1 text-[11px] font-mono text-[var(--text-secondary)] font-semibold">
                <BookOpen :size="11" />
                <span>Excepciones Documentadas & Precedentes (Opcional)</span>
              </label>
              <div class="neu-well-sm rounded-xl p-2.5 border border-[var(--groove-dark)]/40 focus-within:ring-1 focus-within:ring-[var(--accent)]">
                <textarea
                  v-model="formDetails"
                  rows="3"
                  placeholder="Añade precedentes históricos, tratados firmados, casos únicos o matices que enriquecen la narrativa..."
                  class="w-full bg-transparent resize-y min-h-[60px] border-none outline-none font-sans text-xs leading-relaxed text-[var(--text-primary)] placeholder-[var(--text-muted)]/60 cursor-text select-text"
                />
              </div>
            </div>

            <!-- 6. Opción de Anclar regla como prioritaria -->
            <div class="pt-1 flex items-center justify-between">
              <button
                type="button"
                class="neu-btn px-3 py-1.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                :class="formIsPinned ? 'neu-well text-amber-500 font-bold' : 'text-[var(--text-secondary)]'"
                @click="formIsPinned = !formIsPinned"
              >
                <Pin :size="12" :class="{ 'fill-current rotate-45': formIsPinned }" />
                <span>{{ formIsPinned ? 'Regla anclada al inicio' : 'Anclar como regla prioritaria' }}</span>
              </button>

              <span class="text-[10px] font-mono text-[var(--text-muted)]">
                <kbd class="neu-well-sm px-1 py-0.5">Ctrl+Enter</kbd> para guardar
              </span>
            </div>
          </div>

          <!-- Pie del Modal con Acciones -->
          <footer class="p-3 border-t border-[var(--groove-dark)]/40 bg-[var(--bg-surface)] shrink-0 flex items-center justify-end gap-2">
            <button
              type="button"
              class="neu-btn px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer active:scale-95"
              @click="rulesStore.closeModal"
            >
              Cancelar
            </button>

            <button
              type="button"
              class="neu-btn neu-btn-terracotta px-4 py-1.5 text-xs flex items-center gap-1.5 text-white font-semibold transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              :disabled="isSaving"
              @click="handleSave"
            >
              <Check :size="13" />
              <span>{{ isSaving ? 'Guardando...' : (rulesStore.editingRule ? 'Guardar Cambios' : 'Crear Regla') }}</span>
            </button>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

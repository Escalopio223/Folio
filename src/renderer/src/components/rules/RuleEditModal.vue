<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import {
  X,
  Pin,
  ChevronDown,
  ChevronUp,
  Tag
} from 'lucide-vue-next'
import { useRulesStore } from '../../stores/rulesStore'
import { useProjectStore } from '../../stores/projectStore'
import { getPresetsForGenre } from '../../utils/rulePresets'

const rulesStore = useRulesStore()
const projectStore = useProjectStore()

const titleInputRef = ref<HTMLInputElement | null>(null)

// Campos reactivos del formulario inline
const formTitle = ref('')
const formCategory = ref('')
const formAxiom = ref('')
const formLimitations = ref('')
const formDetails = ref('')
const formIsPinned = ref(false)

const showExtraNotes = ref(false)
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

  return Array.from(set).slice(0, 5)
})

// Sincronizar formulario al abrir (creación o edición)
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
        // Si ya tenía notas o limitaciones, desplegar automáticamente
        showExtraNotes.value = Boolean(
          rulesStore.editingRule.details?.trim() || rulesStore.editingRule.limitations?.trim()
        )
      } else {
        // Modo Creación
        formTitle.value = ''
        formCategory.value = rulesStore.prefilledCategory || rulesStore.categories[0] || categorySuggestions.value[0] || 'Leyes Naturales'
        formAxiom.value = ''
        formLimitations.value = ''
        formDetails.value = ''
        formIsPinned.value = false
        showExtraNotes.value = false
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
    errorMessage.value = 'Debes especificar una categoría o dominio.'
    return
  }
  if (!axiom) {
    errorMessage.value = 'La ley o axioma fundamental no puede estar vacío.'
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
    errorMessage.value = err instanceof Error ? err.message : 'Error al guardar la regla.'
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
  <div
    v-if="rulesStore.isModalOpen"
    class="neu-surface p-3 rounded-2xl border border-[var(--accent)]/50 shadow-md flex flex-col gap-2.5 animate-fadeIn shrink-0 select-none"
  >
    <!-- Cabecera del Editor Inline: Título de acción, Pin y Cerrar -->
    <div class="flex items-center justify-between gap-2 border-b border-[var(--groove-dark)]/30 pb-2">
      <div class="flex items-center gap-2">
        <span class="text-xs font-editorial font-bold text-[var(--accent)]">
          {{ rulesStore.editingRule ? 'Editar Regla' : 'Nueva Regla del Mundo' }}
        </span>

        <!-- Botón Pin rápido -->
        <button
          type="button"
          class="neu-btn px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1 transition-all cursor-pointer active:scale-95"
          :class="formIsPinned ? 'neu-well text-amber-500 font-bold' : 'text-[var(--text-muted)] hover:text-amber-500'"
          title="Fijar regla como prioritaria al inicio"
          @click="formIsPinned = !formIsPinned"
        >
          <Pin :size="10" :class="{ 'fill-current rotate-45': formIsPinned }" />
          <span>{{ formIsPinned ? 'Fijada' : 'Fijar' }}</span>
        </button>
      </div>

      <button
        type="button"
        class="w-5 h-5 neu-btn rounded flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer active:scale-95 transition-all"
        title="Cancelar y cerrar (Esc)"
        @click="rulesStore.closeModal()"
      >
        <X :size="11" />
      </button>
    </div>

    <!-- 1. TÍTULO Y CATEGORÍA (Compactos en una sola fila) -->
    <div class="flex items-center gap-2">
      <!-- Input de Título -->
      <input
        ref="titleInputRef"
        v-model="formTitle"
        type="text"
        placeholder="Título de la regla o ley..."
        class="flex-1 text-xs font-editorial font-semibold neu-well-sm px-2.5 py-1.5 bg-transparent border-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/60 focus:outline-none cursor-text select-text"
      />

      <!-- Input de Categoría -->
      <div class="flex items-center gap-1 neu-well-sm px-2 py-1.5 w-32 shrink-0">
        <Tag :size="10" class="text-[var(--accent)] shrink-0" />
        <input
          v-model="formCategory"
          type="text"
          placeholder="Categoría"
          class="w-full text-[10px] font-mono text-[var(--accent)] bg-transparent border-none focus:outline-none cursor-text select-text"
        />
      </div>
    </div>

    <!-- Chips rápidos de sugerencia de categoría (si escribe o quiere cambiarla con 1 clic) -->
    <div
      v-if="categorySuggestions.length > 0"
      class="flex items-center gap-1 flex-wrap text-[9px] -mt-1"
    >
      <span class="text-[var(--text-muted)] font-mono text-[8px] opacity-70">Sugerencias:</span>
      <button
        v-for="cat in categorySuggestions"
        :key="cat"
        type="button"
        class="neu-btn px-1.5 py-0.2 rounded text-[9px] transition-all cursor-pointer"
        :class="formCategory.toLowerCase() === cat.toLowerCase() ? 'neu-well text-[var(--accent)] font-bold' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'"
        @click="setCategory(cat)"
      >
        {{ cat }}
      </button>
    </div>

    <!-- 2. LA REGLA / LEY FUNDAMENTAL (Único textarea principal de 2-3 líneas) -->
    <div class="space-y-1">
      <textarea
        v-model="formAxiom"
        rows="3"
        placeholder="Define la ley inquebrantable o su coste al transgredirla..."
        class="w-full text-xs font-editorial italic neu-well-sm p-2.5 bg-transparent border-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/60 focus:outline-none resize-none cursor-text select-text leading-relaxed"
      ></textarea>
    </div>

    <!-- 3. EXCEPCIONES Y NOTAS (Opcional y Colapsable) -->
    <div class="space-y-1.5">
      <button
        type="button"
        class="text-[10px] font-mono text-[var(--accent)] hover:underline flex items-center gap-1 cursor-pointer select-none"
        @click="showExtraNotes = !showExtraNotes"
      >
        <component :is="showExtraNotes ? ChevronUp : ChevronDown" :size="11" />
        <span>{{ showExtraNotes ? 'Ocultar matices y costes' : '+ Añadir matices, costes o excepciones' }}</span>
      </button>

      <div v-if="showExtraNotes" class="space-y-2 pt-1 border-t border-[var(--groove-dark)]/20 animate-fadeIn">
        <!-- Campo opcional de detalles / matices / excepciones -->
        <div>
          <label class="text-[9px] font-mono text-[var(--text-muted)] block mb-0.5">
            Matices, excepciones o notas adicionales:
          </label>
          <textarea
            v-model="formDetails"
            rows="2"
            placeholder="Precedentes históricos, excepciones conocidas o notas..."
            class="w-full text-xs neu-well-sm p-2 bg-transparent border-none text-[var(--text-secondary)] placeholder:text-[var(--text-muted)]/60 focus:outline-none resize-none cursor-text select-text font-sans leading-relaxed"
          ></textarea>
        </div>

        <!-- Campo opcional de limitaciones / costes (retrocompatibilidad) -->
        <div>
          <label class="text-[9px] font-mono text-[#C85A32] block mb-0.5">
            Costes punitivos o consecuencias al transgredir la ley:
          </label>
          <input
            v-model="formLimitations"
            type="text"
            placeholder="Tabúes, coste biológico, castigo penal..."
            class="w-full text-xs neu-well-sm px-2.5 py-1.5 bg-transparent border-none text-[var(--text-secondary)] placeholder:text-[var(--text-muted)]/60 focus:outline-none cursor-text select-text font-sans"
          />
        </div>
      </div>
    </div>

    <!-- Mensaje de Error si hay campos incompletos -->
    <p v-if="errorMessage" class="text-[10px] text-rose-500 font-mono">
      {{ errorMessage }}
    </p>

    <!-- FOOTER: Atajos y Botones de Guardar / Cancelar -->
    <div class="flex items-center justify-between gap-2 pt-1 border-t border-[var(--groove-dark)]/20">
      <span class="text-[9px] font-mono text-[var(--text-muted)] hidden sm:inline">
        Ctrl+Enter para guardar · Esc para cancelar
      </span>

      <div class="flex items-center gap-1.5 ml-auto">
        <button
          type="button"
          class="neu-btn px-2.5 py-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer active:scale-95"
          @click="rulesStore.closeModal()"
        >
          Cancelar
        </button>

        <button
          type="button"
          class="neu-btn-terracotta px-3.5 py-1 text-xs font-semibold flex items-center gap-1 cursor-pointer active:scale-95"
          :disabled="isSaving"
          @click="handleSave"
        >
          <span>{{ isSaving ? 'Guardando...' : (rulesStore.editingRule ? 'Actualizar' : 'Guardar') }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-3px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fadeIn {
  animation: fadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
</style>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import {
  Feather,
  Sparkles,
  Flame,
  Layout,
  Layers,
  Target,
  Check,
  X,
  Compass
} from 'lucide-vue-next'
import { useGoalsStore } from '../../stores/goalsStore'
import { useProjectStore } from '../../stores/projectStore'
import type { SessionGoalType } from '@shared/types'

const goalsStore = useGoalsStore()
const projectStore = useProjectStore()

const customTarget = ref<number>(500)
const customType = ref<'words' | 'scenes' | 'chapters'>('words')
const dontAskAgain = ref<boolean>(false)

const bookTitle = computed(() => projectStore.activeProject?.title || 'tu manuscrito')
const currentWordsFormatted = computed(() =>
  goalsStore.totalManuscriptWords.toLocaleString('es-ES')
)

watch(
  () => goalsStore.isSessionPromptOpen,
  (isOpen) => {
    if (isOpen) {
      customTarget.value = goalsStore.config.dailyWordGoal || 500
      customType.value = 'words'
      dontAskAgain.value = !goalsStore.config.askSessionGoalOnStartup
    }
  },
  { immediate: true }
)

function selectCustomType(type: 'words' | 'scenes' | 'chapters'): void {
  customType.value = type
  if (type === 'words') {
    customTarget.value = goalsStore.config.dailyWordGoal || 500
  } else if (type === 'scenes') {
    customTarget.value = Math.max(1, goalsStore.config.dailySceneGoal || 1)
  } else {
    customTarget.value = Math.max(1, goalsStore.config.dailyChapterGoal || 1)
  }
}

async function persistStartupPreferenceIfChanged(): Promise<void> {
  const newAskValue = !dontAskAgain.value
  if (newAskValue !== goalsStore.config.askSessionGoalOnStartup) {
    await goalsStore.updateConfig({ askSessionGoalOnStartup: newAskValue })
  }
}

async function applyPreset(type: SessionGoalType, target = 0): Promise<void> {
  await persistStartupPreferenceIfChanged()
  goalsStore.setSessionGoal(type, target)
}

async function applyCustomGoal(): Promise<void> {
  const safeTarget = Math.max(1, Number(customTarget.value) || 1)
  await persistStartupPreferenceIfChanged()
  goalsStore.setSessionGoal(customType.value, safeTarget)
}

async function chooseFreeWriting(): Promise<void> {
  await persistStartupPreferenceIfChanged()
  goalsStore.setSessionGoal('free', 0)
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape' && goalsStore.isSessionPromptOpen) {
    chooseFreeWriting()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-250 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="goalsStore.isSessionPromptOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/55 backdrop-blur-sm select-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-ritual-title"
        @click.self="chooseFreeWriting"
      >
        <div
          class="neu-surface max-w-2xl w-full rounded-3xl shadow-2xl border border-[var(--groove-dark)]/70 overflow-hidden relative p-6 md:p-8 space-y-6"
        >
          <!-- Resplandor cálido de fondo -->
          <div
            class="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-[var(--accent)]/10 blur-3xl pointer-events-none"
          ></div>

          <!-- Cabecera Inspiradora -->
          <div class="relative z-10 flex items-start justify-between gap-4">
            <div class="flex items-start gap-4">
              <div
                class="w-12 h-12 rounded-2xl neu-well flex items-center justify-center text-[var(--accent)] shrink-0 mt-0.5"
              >
                <Feather :size="22" />
              </div>
              <div class="space-y-1.5">
                <span
                  class="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full neu-well-sm text-[var(--accent)] font-semibold"
                >
                  <Sparkles :size="12" />
                  <span>Ritual de Inicio</span>
                </span>
                <h2
                  id="session-ritual-title"
                  class="font-editorial text-xl md:text-2xl font-bold text-[var(--text-primary)] leading-snug"
                >
                  Bienvenido a tu santuario, escritor. ¿Qué te gustaría lograr en esta sesión?
                </h2>
                <p class="text-sm text-[var(--text-secondary)]">
                  Llevas
                  <strong class="font-mono font-semibold text-[var(--text-primary)]">
                    {{ currentWordsFormatted }} palabras
                  </strong>
                  en <span class="font-editorial italic">«{{ bookTitle }}»</span>.
                </p>
              </div>
            </div>

            <button
              type="button"
              class="w-8 h-8 rounded-xl neu-btn flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer shrink-0"
              title="Escribir libremente sin meta (Esc)"
              @click="chooseFreeWriting"
            >
              <X :size="16" />
            </button>
          </div>

          <!-- Selección Rápida en 1 Clic (Presets Táctiles Neumórficos) -->
          <div class="space-y-2.5 relative z-10">
            <div class="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] font-mono">
              Selección rápida en 1 clic
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <!-- Pluma Ligera -->
              <button
                type="button"
                class="neu-btn p-4 rounded-2xl text-left flex items-start gap-3.5 group hover:border-[var(--accent)]/50 transition-all cursor-pointer"
                @click="applyPreset('words', 250)"
              >
                <div
                  class="w-10 h-10 rounded-xl neu-well-sm flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:scale-105 transition-transform"
                >
                  <Feather :size="18" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center justify-between gap-2">
                    <span class="font-editorial text-base font-bold text-[var(--text-primary)]">
                      Pluma Ligera
                    </span>
                    <span
                      class="text-xs font-mono font-bold px-2 py-0.5 rounded-lg neu-well-sm text-[var(--accent)]"
                    >
                      250 pal.
                    </span>
                  </div>
                  <p class="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                    Ideal para arrancar sin bloqueo y tomar pulso a la escena.
                  </p>
                </div>
              </button>

              <!-- Ritmo Editorial -->
              <button
                type="button"
                class="neu-btn p-4 rounded-2xl text-left flex items-start gap-3.5 group hover:border-[var(--accent)]/50 transition-all cursor-pointer"
                @click="applyPreset('words', 500)"
              >
                <div
                  class="w-10 h-10 rounded-xl neu-well-sm flex items-center justify-center text-[var(--accent)] shrink-0 group-hover:scale-105 transition-transform"
                >
                  <Target :size="18" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center justify-between gap-2">
                    <span class="font-editorial text-base font-bold text-[var(--text-primary)]">
                      Ritmo Editorial
                    </span>
                    <span
                      class="text-xs font-mono font-bold px-2 py-0.5 rounded-lg neu-well-sm text-[var(--accent)]"
                    >
                      500 pal.
                    </span>
                  </div>
                  <p class="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                    Tu meta habitual para consolidar páginas con constancia.
                  </p>
                </div>
              </button>

              <!-- Inmersión Profunda -->
              <button
                type="button"
                class="neu-btn p-4 rounded-2xl text-left flex items-start gap-3.5 group hover:border-[var(--accent)]/50 transition-all cursor-pointer"
                @click="applyPreset('words', 1000)"
              >
                <div
                  class="w-10 h-10 rounded-xl neu-well-sm flex items-center justify-center text-amber-500 shrink-0 group-hover:scale-105 transition-transform"
                >
                  <Flame :size="18" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center justify-between gap-2">
                    <span class="font-editorial text-base font-bold text-[var(--text-primary)]">
                      Inmersión Profunda
                    </span>
                    <span
                      class="text-xs font-mono font-bold px-2 py-0.5 rounded-lg neu-well-sm text-[var(--accent)]"
                    >
                      1.000 pal.
                    </span>
                  </div>
                  <p class="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                    Sesión intensa para desarrollar giros y capítulos largos.
                  </p>
                </div>
              </button>

              <!-- Avance de Estructura: 1 Escena o 1 Capítulo -->
              <div
                class="neu-btn p-4 rounded-2xl text-left flex flex-col justify-between gap-2.5 border border-transparent"
              >
                <div class="flex items-start gap-3">
                  <div
                    class="w-10 h-10 rounded-xl neu-well-sm flex items-center justify-center text-sky-500 shrink-0"
                  >
                    <Layout :size="18" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <span class="font-editorial text-base font-bold text-[var(--text-primary)] block">
                      Avance de Estructura
                    </span>
                    <p class="text-xs text-[var(--text-secondary)] mt-0.5 leading-snug">
                      Enfócate en cerrar unidades narrativas hoy:
                    </p>
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-2 pt-0.5">
                  <button
                    type="button"
                    class="neu-well-sm hover:neu-btn py-1.5 px-2.5 rounded-xl text-xs font-mono font-semibold text-[var(--text-primary)] hover:text-[var(--accent)] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    @click="applyPreset('scenes', 1)"
                  >
                    <Layout :size="12" class="text-sky-500" />
                    <span>1 Escena</span>
                  </button>
                  <button
                    type="button"
                    class="neu-well-sm hover:neu-btn py-1.5 px-2.5 rounded-xl text-xs font-mono font-semibold text-[var(--text-primary)] hover:text-[var(--accent)] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    @click="applyPreset('chapters', 1)"
                  >
                    <Layers :size="12" class="text-teal-500" />
                    <span>1 Capítulo</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Ajuste Personalizado Flexible -->
          <div class="neu-well p-4 rounded-2xl space-y-3 relative z-10">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-[var(--text-primary)]">
                O define un objetivo a tu medida para hoy:
              </span>
            </div>

            <div class="flex flex-wrap items-center gap-2.5">
              <input
                v-model.number="customTarget"
                type="number"
                :min="1"
                :step="customType === 'words' ? 50 : 1"
                class="w-28 neu-surface px-3.5 py-2 rounded-xl text-sm font-mono font-bold text-[var(--text-primary)] border border-[var(--groove-dark)]/40 focus:outline-none focus:border-[var(--accent)]"
                @keydown.enter.prevent="applyCustomGoal"
              />

              <!-- Selector Palabras | Escenas | Capítulos -->
              <div class="flex items-center p-1 rounded-xl neu-surface gap-1">
                <button
                  v-for="opt in [
                    { id: 'words', label: 'Palabras' },
                    { id: 'scenes', label: 'Escenas' },
                    { id: 'chapters', label: 'Capítulos' }
                  ]"
                  :key="opt.id"
                  type="button"
                  class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer"
                  :class="
                    customType === opt.id
                      ? 'neu-well-sm font-semibold text-[var(--accent)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  "
                  @click="selectCustomType(opt.id as any)"
                >
                  {{ opt.label }}
                </button>
              </div>

              <button
                type="button"
                class="neu-btn-terracotta px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 ml-auto cursor-pointer"
                @click="applyCustomGoal"
              >
                <Check :size="14" />
                <span>Empezar sesión</span>
              </button>
            </div>
          </div>

          <!-- Pie: Escape Amigable (Cero Presión) + Checkbox No Preguntar al Iniciar -->
          <div
            class="pt-2 border-t border-[var(--groove-dark)]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10"
          >
            <label
              class="flex items-center gap-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <input
                v-model="dontAskAgain"
                type="checkbox"
                class="rounded accent-[var(--accent)] w-3.5 h-3.5 cursor-pointer"
              />
              <span>No preguntar al iniciar (usar siempre mi meta diaria por defecto)</span>
            </label>

            <button
              type="button"
              class="neu-btn px-4 py-2 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              @click="chooseFreeWriting"
            >
              <Compass :size="13" class="text-[var(--text-muted)]" />
              <span>Hoy solo quiero escribir libremente (Sin meta)</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>


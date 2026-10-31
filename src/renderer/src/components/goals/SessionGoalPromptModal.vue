<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { X, Target, Sparkles } from 'lucide-vue-next'
import { useGoalsStore } from '../../stores/goalsStore'
import { useProjectStore } from '../../stores/projectStore'

const LAST_SESSION_GOAL_KEY = 'folio:lastSessionWordGoal'
const SKIP_PROMPT_KEY = 'folio:skipSessionGoalPrompt'

const goalsStore = useGoalsStore()
const projectStore = useProjectStore()

const inputRef = ref<HTMLInputElement | null>(null)
const wordTarget = ref<number>(500)
const dontAskAgain = ref<boolean>(false)

const currentWordsFormatted = computed(() =>
  goalsStore.totalManuscriptWords.toLocaleString('es-ES')
)

const bookTitle = computed(() => projectStore.activeProject?.title || '')

const parsedTarget = computed<number>(() => {
  const n = Number(wordTarget.value)
  return Number.isFinite(n) ? Math.floor(n) : 500
})

// Mínimo estricto de 500 palabras
const isValidTarget = computed<boolean>(() => parsedTarget.value >= 500)

watch(
  () => goalsStore.isSessionPromptOpen,
  (isOpen) => {
    if (isOpen) {
      const savedLastTarget = Number(localStorage.getItem(LAST_SESSION_GOAL_KEY))
      wordTarget.value =
        Number.isFinite(savedLastTarget) && savedLastTarget >= 500
          ? savedLastTarget
          : goalsStore.sessionWordTarget || 500

      const savedSkip = localStorage.getItem(SKIP_PROMPT_KEY) === 'true'
      dontAskAgain.value = savedSkip || !goalsStore.config.askSessionGoalOnStartup

      nextTick(() => {
        inputRef.value?.focus()
        inputRef.value?.select()
      })
    }
  },
  { immediate: true }
)

function focusEditorAfterClose(): void {
  nextTick(() => {
    const editor = document.querySelector('.ProseMirror') as HTMLElement | null
    editor?.focus()
  })
}

async function persistStartupPreference(): Promise<void> {
  const newAskValue = !dontAskAgain.value
  localStorage.setItem(SKIP_PROMPT_KEY, String(dontAskAgain.value))
  if (newAskValue !== goalsStore.config.askSessionGoalOnStartup) {
    await goalsStore.updateConfig({ askSessionGoalOnStartup: newAskValue })
  }
}

async function handleStartWithGoal(): Promise<void> {
  if (!isValidTarget.value) return
  const target = Math.max(500, parsedTarget.value)
  localStorage.setItem(LAST_SESSION_GOAL_KEY, String(target))
  await persistStartupPreference()
  goalsStore.setSessionGoal('words', target)
  focusEditorAfterClose()
}

async function handleWriteWithoutGoal(): Promise<void> {
  await persistStartupPreference()
  goalsStore.setSessionGoal('free', 0)
  focusEditorAfterClose()
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape' && goalsStore.isSessionPromptOpen) {
    e.preventDefault()
    handleWriteWithoutGoal()
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
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="goalsStore.isSessionPromptOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs select-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-goal-title"
      >
        <div
          class="neu-panel w-full max-w-md rounded-2xl p-6 shadow-2xl border border-[var(--neu-border)] bg-[var(--bg-base)] text-[var(--text-primary)] animate-in fade-in zoom-in-95 duration-150"
        >
          <!-- Cabecera -->
          <div class="flex items-start justify-between gap-4 mb-4">
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-xl neu-well flex items-center justify-center text-[var(--accent)] shrink-0"
              >
                <Target :size="20" />
              </div>
              <div>
                <h3 id="session-goal-title" class="font-editorial text-lg font-bold leading-tight">
                  Ritual de Inicio
                </h3>
                <p class="text-xs text-[var(--text-muted)] mt-0.5">
                  {{ bookTitle ? `«${bookTitle}»` : 'Sesión de escritura' }} · {{ currentWordsFormatted }} pal.
                </p>
              </div>
            </div>

            <button
              type="button"
              class="neu-btn w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
              title="Escribir libremente (Esc)"
              @click="handleWriteWithoutGoal"
            >
              <X :size="14" />
            </button>
          </div>

          <!-- Mensaje motivacional breve -->
          <p class="text-xs text-[var(--text-secondary)] mb-4 leading-relaxed font-sans">
            ¿Cuántas palabras te propones escribir en esta sesión? (Mínimo estricto: 500 palabras).
          </p>

          <!-- Input numérico y presets -->
          <div class="space-y-3 mb-5">
            <div class="relative">
              <input
                ref="inputRef"
                v-model.number="wordTarget"
                type="number"
                min="500"
                step="50"
                class="w-full neu-input px-3.5 py-2.5 rounded-xl text-lg font-bold font-mono text-[var(--text-primary)] focus:outline-none"
                :class="{ '!border-red-500/60': !isValidTarget }"
                placeholder="500"
                @keydown.enter="handleStartWithGoal"
              />
              <span
                class="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-[var(--text-muted)] pointer-events-none"
              >
                palabras
              </span>
            </div>

            <p v-if="!isValidTarget" class="text-[11px] font-mono text-red-500 font-semibold">
              ⚠ El objetivo mínimo permitido es de 500 palabras por sesión.
            </p>

            <!-- Presets rápidos -->
            <div class="flex items-center gap-1.5">
              <span class="text-[10px] font-mono text-[var(--text-muted)]">Rápidos:</span>
              <button
                v-for="p in [500, 750, 1000, 1500, 2000]"
                :key="p"
                type="button"
                class="neu-btn px-2 py-0.5 text-[10px] font-mono rounded cursor-pointer transition-all"
                :class="{ 'neu-well !text-[var(--accent)] font-bold': wordTarget === p }"
                @click="wordTarget = p"
              >
                {{ p }}
              </button>
            </div>
          </div>

          <!-- Preferencia no volver a preguntar -->
          <label class="flex items-center gap-2 mb-5 cursor-pointer text-xs text-[var(--text-muted)]">
            <input
              v-model="dontAskAgain"
              type="checkbox"
              class="rounded border-[var(--neu-border)] text-[var(--accent)] focus:ring-0 cursor-pointer"
            />
            <span>No mostrar este aviso al abrir la aplicación</span>
          </label>

          <!-- Acciones -->
          <div class="flex items-center justify-end gap-2.5">
            <button
              type="button"
              class="neu-btn px-3.5 py-1.5 rounded-xl text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-all"
              @click="handleWriteWithoutGoal"
            >
              Escribir Libre
            </button>

            <button
              type="button"
              class="neu-btn px-4 py-1.5 rounded-xl text-xs font-semibold !text-[var(--accent)] hover:!text-[var(--text-primary)] cursor-pointer transition-all flex items-center gap-1.5"
              :disabled="!isValidTarget"
              @click="handleStartWithGoal"
            >
              <Sparkles :size="13" />
              <span>Aceptar Meta</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

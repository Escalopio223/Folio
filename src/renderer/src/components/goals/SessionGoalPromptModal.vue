<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { X, Check } from 'lucide-vue-next'
import { useGoalsStore } from '../../stores/goalsStore'
import { useProjectStore } from '../../stores/projectStore'

const LAST_SESSION_GOAL_KEY = 'folio:lastSessionWordGoal'
const SKIP_PROMPT_KEY = 'folio:skipSessionGoalPrompt'

const goalsStore = useGoalsStore()
const projectStore = useProjectStore()

const inputRef = ref<HTMLInputElement | null>(null)
const wordTarget = ref<number | string>(500)
const dontAskAgain = ref<boolean>(false)

const currentWordsFormatted = computed(() =>
  goalsStore.totalManuscriptWords.toLocaleString('es-ES')
)

const bookTitle = computed(() => projectStore.activeProject?.title || '')

const parsedTarget = computed<number>(() => {
  const n = Number(wordTarget.value)
  return Number.isFinite(n) ? Math.floor(n) : 0
})

const isValidTarget = computed<boolean>(() => parsedTarget.value > 0)

watch(
  () => goalsStore.isSessionPromptOpen,
  (isOpen) => {
    if (isOpen) {
      const savedLastTarget = Number(localStorage.getItem(LAST_SESSION_GOAL_KEY))
      wordTarget.value =
        Number.isFinite(savedLastTarget) && savedLastTarget > 0
          ? savedLastTarget
          : goalsStore.config.dailyWordGoal || 500

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
    const editorEl = document.querySelector(
      '.tiptap-editor, .ProseMirror, [contenteditable="true"]'
    ) as HTMLElement | null
    editorEl?.focus()
  })
}

async function persistStartupPreference(): Promise<void> {
  if (dontAskAgain.value) {
    localStorage.setItem(SKIP_PROMPT_KEY, 'true')
  } else {
    localStorage.removeItem(SKIP_PROMPT_KEY)
  }

  const newAskValue = !dontAskAgain.value
  if (newAskValue !== goalsStore.config.askSessionGoalOnStartup) {
    await goalsStore.updateConfig({ askSessionGoalOnStartup: newAskValue })
  }
}

async function handleStartWithGoal(): Promise<void> {
  if (!isValidTarget.value) return
  const target = parsedTarget.value
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
        @click.self="handleWriteWithoutGoal"
      >
        <div
          class="neu-surface max-w-md w-full rounded-2xl shadow-2xl border border-[var(--groove-dark)]/70 p-6 space-y-5 relative"
        >
          <!-- Encabezado Conciso -->
          <div class="flex items-start justify-between gap-3">
            <div class="space-y-1">
              <h2
                id="session-goal-title"
                class="font-editorial text-xl font-bold text-[var(--text-primary)] leading-snug"
              >
                ¿Cuál es tu meta para esta sesión?
              </h2>
              <p class="text-xs text-[var(--text-secondary)]">
                Llevas
                <strong class="font-mono font-semibold text-[var(--text-primary)]">
                  {{ currentWordsFormatted }} palabras
                </strong>
                escritas<template v-if="bookTitle"> en «{{ bookTitle }}»</template>.
              </p>
            </div>

            <button
              type="button"
              class="w-7 h-7 rounded-lg neu-btn flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer shrink-0"
              title="Cerrar (Esc)"
              aria-label="Cerrar"
              @click="handleWriteWithoutGoal"
            >
              <X :size="15" />
            </button>
          </div>

          <!-- Input Manual Principal + Botón de Acción Principal -->
          <form class="flex items-center gap-2.5" @submit.prevent="handleStartWithGoal">
            <div class="relative flex-1">
              <input
                ref="inputRef"
                v-model="wordTarget"
                type="number"
                min="1"
                step="50"
                placeholder="Ej. 500"
                aria-label="Meta de palabras para la sesión"
                class="w-full neu-well px-3.5 py-2.5 pr-20 rounded-xl text-base font-mono font-bold text-[var(--text-primary)] bg-transparent border border-transparent focus:border-[var(--accent)]/60 focus:outline-none"
              />
              <span
                class="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-[var(--text-muted)] pointer-events-none"
              >
                palabras
              </span>
            </div>

            <button
              type="submit"
              :disabled="!isValidTarget"
              class="neu-btn-terracotta px-4 py-2.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer disabled:opacity-45 disabled:pointer-events-none"
            >
              Empezar a escribir
            </button>
          </form>

          <!-- Pie: Acción Secundaria (Sin meta) y Casilla de Persistencia -->
          <div
            class="pt-2 border-t border-[var(--groove-dark)]/40 flex flex-wrap items-center justify-between gap-3"
          >
            <label
              class="flex items-center gap-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <button
                type="button"
                role="checkbox"
                :aria-checked="dontAskAgain"
                class="w-4 h-4 rounded-md flex items-center justify-center transition-all cursor-pointer shrink-0"
                :class="
                  dontAskAgain
                    ? 'bg-[var(--accent)] text-white shadow-xs'
                    : 'neu-well-sm text-transparent'
                "
                @click="dontAskAgain = !dontAskAgain"
              >
                <Check :size="11" />
              </button>
              <span>No volver a mostrar al entrar</span>
            </label>

            <button
              type="button"
              class="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--accent)] underline underline-offset-4 transition-colors cursor-pointer"
              @click="handleWriteWithoutGoal"
            >
              Escribir sin meta
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

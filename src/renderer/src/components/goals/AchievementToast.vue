<script setup lang="ts">
import { computed } from 'vue'
import {
  Trophy,
  Target,
  Feather,
  BookOpen,
  Crown,
  CheckCircle,
  Sparkles,
  X
} from 'lucide-vue-next'
import { useGoalsStore } from '../../stores/goalsStore'

const goalsStore = useGoalsStore()

const toast = computed(() => goalsStore.activeToast)

const iconComponent = computed(() => {
  const iconName = toast.value?.icon || 'Trophy'
  switch (iconName) {
    case 'Sparkles':
      return Sparkles
    case 'Target':
      return Target
    case 'Feather':
      return Feather
    case 'BookOpen':
      return BookOpen
    case 'Crown':
      return Crown
    case 'CheckCircle':
      return CheckCircle
    default:
      return Trophy
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0 translate-y-3 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 translate-y-2 scale-95"
    >
      <div
        v-if="toast"
        class="fixed bottom-10 right-6 z-[130] flex items-center gap-3 p-3.5 pr-4 max-w-sm neu-panel rounded-2xl shadow-2xl border border-[var(--neu-border)] bg-[var(--bg-surface)] text-[var(--text-primary)] select-none backdrop-blur-md"
        role="alert"
        aria-live="polite"
      >
        <!-- Icono con halo brillante -->
        <div
          class="w-10 h-10 rounded-xl neu-well-sm flex items-center justify-center shrink-0"
          :class="toast.badgeColor"
        >
          <component :is="iconComponent" :size="20" />
        </div>

        <!-- Contenido textual -->
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-1.5">
            <span class="text-[9px] font-mono uppercase tracking-wider text-[var(--accent)] font-bold">
              {{ toast.type === 'achievement' ? 'Logro Desbloqueado' : 'Meta Cumplida' }}
            </span>
          </div>

          <h4 class="font-editorial text-xs font-bold text-[var(--text-primary)] truncate mt-0.5">
            {{ toast.title }}
          </h4>

          <p class="text-[11px] text-[var(--text-secondary)] leading-snug line-clamp-2 mt-0.5">
            {{ toast.description }}
          </p>
        </div>

        <!-- Botón cerrar rápido -->
        <button
          type="button"
          class="neu-btn w-6 h-6 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all cursor-pointer shrink-0"
          title="Cerrar notificación"
          @click="goalsStore.dismissToast"
        >
          <X :size="12" />
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  Trophy,
  Target,
  Zap,
  Layout,
  Feather,
  BookOpen,
  Compass,
  Award,
  Crown,
  BookmarkCheck,
  Layers,
  Flame,
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
    case 'Zap':
      return Zap
    case 'Layout':
      return Layout
    case 'Feather':
      return Feather
    case 'BookOpen':
      return BookOpen
    case 'Compass':
      return Compass
    case 'Award':
      return Award
    case 'Crown':
      return Crown
    case 'BookmarkCheck':
      return BookmarkCheck
    case 'Layers':
      return Layers
    case 'Flame':
      return Flame
    case 'CheckCircle':
      return CheckCircle
    case 'Trophy':
    default:
      return Trophy
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0 translate-y-6 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 translate-y-4 scale-95"
    >
      <div
        v-if="toast"
        class="fixed bottom-8 right-6 z-50 pointer-events-none max-w-md w-full select-none"
        role="status"
        aria-live="polite"
      >
        <div
          class="pointer-events-none neu-gamification-card p-4 rounded-2xl shadow-2xl border flex items-start gap-3.5 relative overflow-hidden"
          :class="
            toast.type === 'goal'
              ? 'border-[#2E7D32]/50 ring-1 ring-[#2E7D32]/25'
              : 'border-[var(--accent)]/60 ring-1 ring-amber-500/25'
          "
        >
          <!-- Resplandor decorativo cálido en la esquina -->
          <div
            class="absolute -top-10 -right-10 w-28 h-28 rounded-full blur-2xl pointer-events-none opacity-20"
            :class="toast.type === 'goal' ? 'bg-[#2E7D32]' : 'bg-[var(--accent)]'"
          ></div>

          <!-- Icono de Hito con relieve neumórfico -->
          <div
            class="w-11 h-11 rounded-xl neu-well-sm flex items-center justify-center shrink-0"
            :class="toast.badgeColor || 'text-[var(--accent)]'"
          >
            <component :is="iconComponent" :size="22" class="shrink-0" />
          </div>

          <!-- Contenido textual con tipografía serif legible -->
          <div class="flex-1 min-w-0 pr-5">
            <h4 class="font-editorial text-base font-bold text-[var(--text-primary)] leading-snug">
              {{ toast.title }}
            </h4>
            <p class="text-sm text-[var(--text-secondary)] mt-1 leading-relaxed">
              {{ toast.description }}
            </p>
          </div>

          <!-- Botón de Cerrar (único elemento con pointer-events-auto para no robar foco del editor) -->
          <button
            type="button"
            tabindex="-1"
            class="pointer-events-auto absolute top-3 right-3 w-6 h-6 rounded-lg neu-btn flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            title="Cerrar notificación"
            @mousedown.prevent
            @click="goalsStore.dismissToast"
          >
            <X :size="13" />
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

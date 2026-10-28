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
  X
} from 'lucide-vue-next'
import { useGoalsStore } from '../../stores/goalsStore'

const goalsStore = useGoalsStore()

const toast = computed(() => goalsStore.activeToast)

const iconComponent = computed(() => {
  const iconName = toast.value?.icon || 'Trophy'
  switch (iconName) {
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
        class="fixed bottom-6 right-6 z-50 pointer-events-none max-w-sm w-full select-none"
        role="alert"
        aria-live="polite"
      >
        <div
          class="pointer-events-auto neu-surface p-4 rounded-2xl shadow-2xl border border-[var(--groove-dark)]/70 flex items-start gap-3.5 backdrop-blur-md relative overflow-hidden group"
          :class="{
            'ring-1 ring-emerald-500/30': toast.type === 'goal',
            'ring-1 ring-amber-500/30': toast.type === 'achievement'
          }"
        >
          <!-- Resplandor decorativo sutil en la esquina -->
          <div
            class="absolute -top-10 -right-10 w-24 h-24 rounded-full blur-2xl pointer-events-none opacity-20"
            :class="toast.type === 'goal' ? 'bg-emerald-500' : 'bg-amber-500'"
          ></div>

          <!-- Icono de Hito con relieve neumórfico -->
          <div
            class="w-10 h-10 rounded-xl neu-well-sm flex items-center justify-center shrink-0"
            :class="toast.badgeColor || 'text-[var(--accent)]'"
          >
            <component :is="iconComponent" :size="20" class="shrink-0" />
          </div>

          <!-- Contenido textual motivador -->
          <div class="flex-1 min-w-0 pr-4">
            <h4 class="font-editorial text-sm font-bold text-[var(--text-primary)] leading-snug">
              {{ toast.title }}
            </h4>
            <p class="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
              {{ toast.description }}
            </p>
          </div>

          <!-- Botón de Cerrar -->
          <button
            type="button"
            class="absolute top-3 right-3 w-6 h-6 rounded-lg neu-btn flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            title="Cerrar notificación"
            @click="goalsStore.dismissToast"
          >
            <X :size="12" />
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

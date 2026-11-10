<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { computePosition, flip, shift, offset } from '@floating-ui/dom'
import { onClickOutside } from '@vueuse/core'
import { Tag, Check, X, Pipette, Palette } from 'lucide-vue-next'
import {
  CATEGORY_COLOR_PRESETS,
  isLightColor,
  getCategoryBadgeStyle
} from '../../utils/categoryColors'

const props = withDefaults(
  defineProps<{
    modelValue?: string | null
    title?: string
    size?: 'sm' | 'md'
    align?: 'left' | 'right'
    variant?: 'pill' | 'dot' | 'icon'
    showLabel?: boolean
  }>(),
  {
    modelValue: null,
    title: 'Etiqueta de color',
    size: 'sm',
    align: 'left',
    variant: 'pill',
    showLabel: false
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', color: string | null): void
}>()

const isOpen = ref(false)
const triggerBtnRef = ref<HTMLElement | null>(null)
const popoverRef = ref<HTMLElement | null>(null)
const customColorDraft = ref(props.modelValue || '#F97316')

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      customColorDraft.value = val
    }
  }
)

async function updatePopoverPosition(): Promise<void> {
  if (!triggerBtnRef.value || !popoverRef.value) return

  const { x, y } = await computePosition(triggerBtnRef.value, popoverRef.value, {
    placement: props.align === 'right' ? 'bottom-end' : 'bottom-start',
    middleware: [
      offset(6),
      flip({ fallbackPlacements: ['top-start', 'top-end', 'bottom-start', 'bottom-end'] }),
      shift({ padding: 12 })
    ]
  })

  if (popoverRef.value) {
    Object.assign(popoverRef.value.style, {
      left: `${Math.round(x)}px`,
      top: `${Math.round(y)}px`
    })
  }
}

watch(isOpen, async (open) => {
  if (open) {
    await nextTick()
    await updatePopoverPosition()
  }
})

function handleScrollOrResize(): void {
  if (isOpen.value) {
    updatePopoverPosition()
  }
}

onMounted(() => {
  window.addEventListener('resize', handleScrollOrResize, { passive: true })
  window.addEventListener('scroll', handleScrollOrResize, { capture: true, passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleScrollOrResize)
  window.removeEventListener('scroll', handleScrollOrResize, { capture: true })
})

onClickOutside(popoverRef, (event) => {
  if (triggerBtnRef.value && triggerBtnRef.value.contains(event.target as Node)) {
    return
  }
  isOpen.value = false
})

function toggleOpen(): void {
  isOpen.value = !isOpen.value
}

function selectColor(color: string): void {
  emit('update:modelValue', color)
  customColorDraft.value = color
  isOpen.value = false
}

function clearColor(): void {
  emit('update:modelValue', null)
  isOpen.value = false
}

function handleCustomInput(event: Event): void {
  const target = event.target as HTMLInputElement
  if (target?.value) {
    customColorDraft.value = target.value
    emit('update:modelValue', target.value)
  }
}

function handleHexInput(event: Event): void {
  const target = event.target as HTMLInputElement
  const raw = target.value.trim()
  const validHex = /^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/i
  if (validHex.test(raw)) {
    const formatted = raw.startsWith('#') ? raw : `#${raw}`
    customColorDraft.value = formatted
    emit('update:modelValue', formatted)
  }
}

const activePresetName = computed(() => {
  if (!props.modelValue) return null
  const found = CATEGORY_COLOR_PRESETS.find(
    (p) => p.value.toLowerCase() === props.modelValue?.toLowerCase()
  )
  return found ? found.name : 'Personalizado'
})
</script>

<template>
  <div class="inline-flex items-center shrink-0 select-none" @click.stop>
    <!-- DISPARADOR: Con etiqueta de color asignada -->
    <button
      v-if="modelValue"
      ref="triggerBtnRef"
      type="button"
      class="rounded-full flex items-center gap-1.5 transition-all cursor-pointer hover:scale-105 active:scale-95 group focus:outline-none"
      :class="[
        size === 'md' ? 'px-2 py-0.5 text-xs' : 'px-1.5 py-0.5 text-[10px]',
        'neu-well border shadow-sm'
      ]"
      :style="getCategoryBadgeStyle(modelValue)"
      :title="`${title}: ${activePresetName} (${modelValue}). Clic para cambiar`"
      @click.stop="toggleOpen"
    >
      <span
        class="rounded-full shrink-0 shadow-sm"
        :class="size === 'md' ? 'w-2.5 h-2.5' : 'w-2 h-2'"
        :style="{ backgroundColor: modelValue }"
      />
      <span v-if="showLabel" class="font-mono font-medium truncate max-w-[70px]">
        {{ activePresetName }}
      </span>
    </button>

    <!-- DISPARADOR: Sin color asignado -->
    <button
      v-else
      ref="triggerBtnRef"
      type="button"
      class="rounded-lg flex items-center justify-center transition-all cursor-pointer active:scale-95 text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--bg-base)]/50 focus:outline-none"
      :class="[
        size === 'md' ? 'w-6 h-6 p-1' : 'w-5 h-5 p-0.5',
        variant === 'icon' ? '' : 'neu-btn-ghost opacity-60 hover:opacity-100'
      ]"
      :title="title"
      @click.stop="toggleOpen"
    >
      <Tag :size="size === 'md' ? 13 : 11" />
    </button>

    <!-- POPOVER FLOTANTE TELEPORTADO AL BODY CON Z-INDEX MÁXIMO -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0 scale-95 -translate-y-1"
        enter-to-class="opacity-100 scale-100 translate-y-0"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="opacity-100 scale-100 translate-y-0"
        leave-to-class="opacity-0 scale-95 -translate-y-1"
      >
        <div
          v-if="isOpen"
          ref="popoverRef"
          class="fixed z-[9999] p-3 neu-surface border border-[var(--groove-dark)]/60 rounded-2xl shadow-2xl backdrop-blur-md min-w-[250px] text-xs space-y-2.5 bg-[var(--bg-surface)] text-[var(--text-primary)]"
          role="dialog"
          aria-label="Selector de etiqueta de color"
          @click.stop
        >
          <!-- Cabecera del popover -->
          <div class="flex items-center justify-between gap-2 border-b border-[var(--groove-dark)]/30 pb-2">
            <div class="flex items-center gap-1.5 font-editorial font-bold text-[var(--text-primary)]">
              <Palette :size="13" class="text-[var(--accent)]" />
              <span>Etiqueta de Color</span>
            </div>

            <!-- Botón de Quitar / Restablecer -->
            <button
              v-if="modelValue"
              type="button"
              class="text-[10px] font-mono text-rose-400 hover:text-rose-500 hover:underline flex items-center gap-1 cursor-pointer transition-colors"
              title="Quitar etiqueta de color"
              @click="clearColor"
            >
              <X :size="11" />
              <span>Quitar</span>
            </button>
          </div>

          <!-- Cuadrícula de colores predefinidos editoriales -->
          <div class="space-y-1">
            <span class="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider block">
              Paleta editorial
            </span>
            <div class="grid grid-cols-6 gap-1.5">
              <button
                v-for="preset in CATEGORY_COLOR_PRESETS"
                :key="preset.value"
                type="button"
                class="w-6 h-6 rounded-full flex items-center justify-center transition-transform hover:scale-115 active:scale-95 cursor-pointer relative shadow-sm border border-black/15 group"
                :style="{ backgroundColor: preset.value }"
                :title="`${preset.name}: ${preset.description}`"
                @click="selectColor(preset.value)"
              >
                <Check
                  v-if="modelValue?.toLowerCase() === preset.value.toLowerCase()"
                  :size="12"
                  :class="isLightColor(preset.value) ? 'text-stone-900' : 'text-white'"
                  class="drop-shadow-sm font-bold stroke-[3]"
                />
              </button>
            </div>
          </div>

          <!-- Selector personalizado manual (Input nativo + Hexadecimal) -->
          <div class="pt-1.5 border-t border-[var(--groove-dark)]/30 space-y-1.5">
            <span class="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider block">
              Color a mano
            </span>
            <div class="flex items-center gap-2">
              <!-- Muestra con input color nativo -->
              <label
                class="w-7 h-7 rounded-lg border border-[var(--groove-dark)]/60 neu-well flex items-center justify-center cursor-pointer shrink-0 relative overflow-hidden transition-transform hover:scale-105"
                :style="{ backgroundColor: customColorDraft }"
                title="Abrir selector de color del sistema"
              >
                <input
                  type="color"
                  :value="customColorDraft"
                  class="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  @input="handleCustomInput"
                />
                <Pipette
                  :size="11"
                  :class="isLightColor(customColorDraft) ? 'text-stone-900' : 'text-white'"
                  class="pointer-events-none drop-shadow-sm"
                />
              </label>

              <!-- Campo Hexadecimal editable -->
              <div class="flex-1 flex items-center neu-well-sm px-2 py-1 rounded-lg">
                <span class="text-[10px] font-mono text-[var(--text-muted)] select-none">#</span>
                <input
                  type="text"
                  :value="customColorDraft.replace('#', '')"
                  placeholder="F97316"
                  maxlength="6"
                  class="w-full bg-transparent border-none outline-none font-mono text-xs text-[var(--text-primary)] px-1 uppercase"
                  @input="handleHexInput"
                />
              </div>

              <!-- Botón aplicar -->
              <button
                type="button"
                class="neu-btn px-2.5 py-1 text-[10px] font-semibold text-[var(--accent)] rounded-lg cursor-pointer hover:scale-105 active:scale-95 transition-all"
                @click="selectColor(customColorDraft)"
              >
                Fijar
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

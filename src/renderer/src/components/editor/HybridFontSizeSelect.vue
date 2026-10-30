<script setup lang="ts">
import { ref, watch } from 'vue'
import { onClickOutside } from '@vueuse/core'
import { ChevronDown, Check, RotateCcw } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    modelValue?: number | null
    unit?: 'px' | 'pt'
    min?: number
    max?: number
    presets?: number[]
    placeholder?: string
    allowReset?: boolean
    title?: string
  }>(),
  {
    modelValue: 16,
    unit: 'px',
    min: 6,
    max: 96,
    presets: () => [10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48],
    placeholder: '16',
    allowReset: false,
    title: 'Tamaño de fuente (admite decimales como 13.5)'
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void
  (e: 'apply', cssValue: string, numericValue: number): void
  (e: 'reset'): void
}>()

const containerRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)
const isOpen = ref(false)
const rawInput = ref<string>(
  props.modelValue !== null && props.modelValue !== undefined ? String(props.modelValue) : ''
)

watch(
  () => props.modelValue,
  (val) => {
    if (document.activeElement !== inputRef.value) {
      rawInput.value = val !== null && val !== undefined ? String(val) : ''
    }
  }
)

onClickOutside(containerRef, () => {
  if (isOpen.value) {
    isOpen.value = false
  }
})

function validateAndCommit(): void {
  const normalized = rawInput.value.trim().replace(',', '.')
  if (!normalized) {
    if (props.allowReset) {
      rawInput.value = ''
      emit('reset')
      return
    }
    const fallback = props.modelValue ?? 16
    rawInput.value = String(fallback)
    return
  }

  const parsed = parseFloat(normalized)
  if (isNaN(parsed)) {
    rawInput.value =
      props.modelValue !== null && props.modelValue !== undefined ? String(props.modelValue) : ''
    return
  }

  const clamped = Math.max(props.min, Math.min(props.max, Math.round(parsed * 100) / 100))
  rawInput.value = String(clamped)
  emit('update:modelValue', clamped)
  emit('apply', `${clamped}${props.unit}`, clamped)
}

function handleEnterKey(): void {
  validateAndCommit()
  isOpen.value = false
  inputRef.value?.blur()
}

function selectPreset(size: number): void {
  const clamped = Math.max(props.min, Math.min(props.max, Math.round(size * 100) / 100))
  rawInput.value = String(clamped)
  emit('update:modelValue', clamped)
  emit('apply', `${clamped}${props.unit}`, clamped)
  isOpen.value = false
}

function handleReset(): void {
  rawInput.value = ''
  emit('reset')
  isOpen.value = false
}
</script>

<template>
  <div ref="containerRef" class="relative inline-flex items-center shrink-0" :title="title">
    <!-- Contenedor Combobox Neumórfico (Input numérico con decimales + botón desplegable) -->
    <div
      class="inline-flex items-center h-7 rounded-lg neu-btn px-1.5 gap-0.5 focus-within:ring-1 focus-within:ring-[var(--accent)]/50"
      :class="{ 'neu-well': isOpen }"
    >
      <input
        ref="inputRef"
        v-model="rawInput"
        type="text"
        inputmode="decimal"
        :placeholder="placeholder"
        class="w-10 bg-transparent border-none focus:outline-none text-[11px] font-mono font-semibold text-center text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/60"
        aria-label="Tamaño de fuente"
        @focus="($event.target as HTMLInputElement).select()"
        @blur="validateAndCommit"
        @keydown.enter.prevent="handleEnterKey"
        @keydown.escape.prevent="isOpen = false"
      />
      <span class="text-[9px] font-mono text-[var(--text-muted)] select-none">
        {{ unit }}
      </span>
      <button
        type="button"
        class="w-4 h-5 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
        title="Desplegar tamaños predeterminados"
        @mousedown.prevent
        @click="isOpen = !isOpen"
      >
        <ChevronDown
          :size="11"
          class="transition-transform duration-150"
          :class="{ 'rotate-180 text-[var(--accent)]': isOpen }"
        />
      </button>
    </div>

    <!-- Menú Desplegable de Presets + Ayuda de decimales -->
    <Transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="opacity-0 translate-y-1 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition duration-75 ease-in"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 translate-y-1 scale-95"
    >
      <div
        v-if="isOpen"
        class="absolute left-0 top-full mt-2 z-50 neu-surface p-1.5 min-w-[155px] shadow-2xl rounded-xl border border-[var(--groove-dark)]/60 backdrop-blur-lg bg-[var(--bg-surface)]"
      >
        <div
          class="px-2 py-1 text-[9px] font-mono uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--groove-dark)]/30 mb-1 flex items-center justify-between"
        >
          <span>Tamaño ({{ min }}–{{ max }}{{ unit }})</span>
          <span class="text-[var(--accent)]">13.5 ok</span>
        </div>

        <div class="max-h-48 overflow-y-auto editorial-scrollbar space-y-0.5">
          <button
            v-for="preset in presets"
            :key="preset"
            type="button"
            class="w-full px-2.5 py-1 rounded-lg text-left text-xs font-mono flex items-center justify-between hover:bg-[var(--bg-base)] transition-colors cursor-pointer"
            :class="
              Number(rawInput) === preset
                ? 'text-[var(--accent)] font-bold neu-well-sm'
                : 'text-[var(--text-primary)]'
            "
            @mousedown.prevent
            @click="selectPreset(preset)"
          >
            <span>{{ preset }} {{ unit }}</span>
            <Check
              v-if="Number(rawInput) === preset"
              :size="11"
              class="text-[var(--accent)] shrink-0"
            />
          </button>
        </div>

        <template v-if="allowReset">
          <div class="neu-groove-h my-1"></div>
          <button
            type="button"
            class="w-full px-2 py-1 rounded-lg text-left text-[11px] flex items-center gap-1.5 hover:bg-[var(--bg-base)] text-[var(--text-secondary)] transition-colors cursor-pointer"
            @mousedown.prevent
            @click="handleReset"
          >
            <RotateCcw :size="11" />
            <span>Tamaño por defecto</span>
          </button>
        </template>
      </div>
    </Transition>
  </div>
</template>


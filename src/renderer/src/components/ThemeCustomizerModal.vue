<script setup lang="ts">
import { computed, ref } from 'vue'
import { useUiStore, THEME_COLOR_PRESETS } from '../stores/uiStore'
import { X, RotateCcw, Check, Pipette, Pencil, Sun, Moon } from 'lucide-vue-next'

const uiStore = useUiStore()

const btnColorInput = ref<HTMLInputElement | null>(null)
const textColorInput = ref<HTMLInputElement | null>(null)
const bgColorInput = ref<HTMLInputElement | null>(null)

const buttonSwatches = [
  '#C85A32',
  '#0D9488',
  '#2563EB',
  '#8B5CF6',
  '#D97706',
  '#E11D48',
  '#38BDF8'
]

const textSwatches = [
  '#261C14',
  '#0F172A',
  '#112A26',
  '#3B2314',
  '#F5EFE6',
  '#F8FAFC'
]

const bgSwatches = [
  '#EFEAE1',
  '#E2F2EE',
  '#E6EFFA',
  '#F5E6D3',
  '#16110E',
  '#0B132B',
  '#171124'
]

const lightPresets = computed(() => THEME_COLOR_PRESETS.filter((p) => p.mode === 'light'))
const darkPresets = computed(() => THEME_COLOR_PRESETS.filter((p) => p.mode === 'dark'))

const activePresetId = computed(() => {
  const found = THEME_COLOR_PRESETS.find(
    (p) =>
      p.buttonColor.toUpperCase() === uiStore.buttonColor.toUpperCase() &&
      p.textColor.toUpperCase() === uiStore.textColor.toUpperCase() &&
      p.backgroundColor.toUpperCase() === uiStore.backgroundColor.toUpperCase()
  )
  return found?.id || null
})

function updateButtonColor(val: string): void {
  uiStore.setCustomColors({ buttonColor: val })
}

function updateTextColor(val: string): void {
  uiStore.setCustomColors({ textColor: val })
}

function updateBackgroundColor(val: string): void {
  uiStore.setCustomColors({ backgroundColor: val })
}

function updateFilterIntensity(e: Event): void {
  const val = Number((e.target as HTMLInputElement).value)
  uiStore.setCustomColors({ bgFilterIntensity: val })
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="uiStore.isThemeModalOpen"
        class="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm select-none"
        @click.self="uiStore.closeThemeModal()"
      >
        <div
          class="neu-surface w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl overflow-hidden"
        >
          <!-- Header Limpio: Solo "Tema personalizado" -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-base)]/50">
            <h2 class="font-editorial text-xl font-bold text-[var(--text-primary)]">
              Tema personalizado
            </h2>

            <div class="flex items-center gap-2.5">
              <button
                type="button"
                class="neu-btn px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--accent)] cursor-pointer"
                title="Restablecer al tema claro por defecto"
                @click="uiStore.resetToDefaultLightTheme()"
              >
                <RotateCcw class="w-3.5 h-3.5" />
                <span>Por defecto</span>
              </button>
              <button
                type="button"
                class="neu-icon-btn w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--accent)] cursor-pointer"
                title="Cerrar"
                @click="uiStore.closeThemeModal()"
              >
                <X class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- Body -->
          <div class="flex-1 overflow-y-auto editorial-scrollbar p-6 space-y-6">
            <!-- 3 Colores Principales -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <!-- Botones y bordes -->
              <div class="neu-card p-4 rounded-2xl flex flex-col justify-between space-y-4">
                <span class="text-sm font-bold text-[var(--text-primary)]">
                  Botones y bordes
                </span>

                <!-- Botón neumórfico explícito para abrir el selector de color -->
                <button
                  type="button"
                  class="neu-btn w-full p-2.5 rounded-xl flex items-center justify-between gap-2 cursor-pointer group"
                  title="Haz clic para abrir la paleta de colores"
                  @click="btnColorInput?.click()"
                >
                  <div class="flex items-center gap-2.5">
                    <span
                      class="w-7 h-7 rounded-lg neu-swatch shrink-0"
                      :style="{ backgroundColor: uiStore.buttonColor }"
                    />
                    <span class="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                      Elegir color
                    </span>
                  </div>
                  <Pipette class="w-4 h-4 text-[var(--text-secondary)] group-hover:text-[var(--accent)] transition-colors" />
                  <input
                    ref="btnColorInput"
                    type="color"
                    :value="uiStore.buttonColor"
                    class="sr-only"
                    @input="updateButtonColor(($event.target as HTMLInputElement).value)"
                  />
                </button>

                <!-- Campo HEX hundido (neu-well-sm) editable con icono de lápiz -->
                <label
                  class="neu-well-sm px-3 py-2 rounded-xl flex items-center justify-between gap-2 cursor-text"
                  title="Escribe o pega un código de color HEX"
                >
                  <span class="text-[10px] uppercase font-mono font-semibold text-[var(--text-muted)]">HEX</span>
                  <input
                    type="text"
                    :value="uiStore.buttonColor"
                    maxlength="7"
                    class="w-full bg-transparent text-xs font-mono font-bold text-center text-[var(--text-primary)] focus:outline-none"
                    @change="updateButtonColor(($event.target as HTMLInputElement).value)"
                  />
                  <Pencil class="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                </label>

                <!-- Muestras rápidas neumórficas -->
                <div class="flex items-center justify-between pt-1">
                  <button
                    v-for="swatch in buttonSwatches"
                    :key="swatch"
                    type="button"
                    class="w-6 h-6 rounded-full neu-swatch flex items-center justify-center cursor-pointer"
                    :class="{ 'is-selected': uiStore.buttonColor.toUpperCase() === swatch.toUpperCase() }"
                    :style="{ backgroundColor: swatch }"
                    @click="updateButtonColor(swatch)"
                  >
                    <Check
                      v-if="uiStore.buttonColor.toUpperCase() === swatch.toUpperCase()"
                      class="w-3 h-3 text-white drop-shadow"
                    />
                  </button>
                </div>
              </div>

              <!-- Texto -->
              <div class="neu-card p-4 rounded-2xl flex flex-col justify-between space-y-4">
                <span class="text-sm font-bold text-[var(--text-primary)]">
                  Texto
                </span>

                <!-- Botón neumórfico explícito para abrir el selector de color -->
                <button
                  type="button"
                  class="neu-btn w-full p-2.5 rounded-xl flex items-center justify-between gap-2 cursor-pointer group"
                  title="Haz clic para abrir la paleta de colores"
                  @click="textColorInput?.click()"
                >
                  <div class="flex items-center gap-2.5">
                    <span
                      class="w-7 h-7 rounded-lg neu-swatch shrink-0"
                      :style="{ backgroundColor: uiStore.textColor }"
                    />
                    <span class="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                      Elegir color
                    </span>
                  </div>
                  <Pipette class="w-4 h-4 text-[var(--text-secondary)] group-hover:text-[var(--accent)] transition-colors" />
                  <input
                    ref="textColorInput"
                    type="color"
                    :value="uiStore.textColor"
                    class="sr-only"
                    @input="updateTextColor(($event.target as HTMLInputElement).value)"
                  />
                </button>

                <!-- Campo HEX hundido editable con icono de lápiz -->
                <label
                  class="neu-well-sm px-3 py-2 rounded-xl flex items-center justify-between gap-2 cursor-text"
                  title="Escribe o pega un código de color HEX"
                >
                  <span class="text-[10px] uppercase font-mono font-semibold text-[var(--text-muted)]">HEX</span>
                  <input
                    type="text"
                    :value="uiStore.textColor"
                    maxlength="7"
                    class="w-full bg-transparent text-xs font-mono font-bold text-center text-[var(--text-primary)] focus:outline-none"
                    @change="updateTextColor(($event.target as HTMLInputElement).value)"
                  />
                  <Pencil class="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                </label>

                <!-- Muestras rápidas neumórficas -->
                <div class="flex items-center justify-between pt-1">
                  <button
                    v-for="swatch in textSwatches"
                    :key="swatch"
                    type="button"
                    class="w-6 h-6 rounded-full neu-swatch flex items-center justify-center cursor-pointer"
                    :class="{ 'is-selected': uiStore.textColor.toUpperCase() === swatch.toUpperCase() }"
                    :style="{ backgroundColor: swatch }"
                    @click="updateTextColor(swatch)"
                  >
                    <Check
                      v-if="uiStore.textColor.toUpperCase() === swatch.toUpperCase()"
                      class="w-3 h-3 text-[var(--accent)] drop-shadow"
                    />
                  </button>
                </div>
              </div>

              <!-- Fondo de la aplicación -->
              <div class="neu-card p-4 rounded-2xl flex flex-col justify-between space-y-4">
                <span class="text-sm font-bold text-[var(--text-primary)]">
                  Fondo de la aplicación
                </span>

                <!-- Botón neumórfico explícito para abrir el selector de color -->
                <button
                  type="button"
                  class="neu-btn w-full p-2.5 rounded-xl flex items-center justify-between gap-2 cursor-pointer group"
                  title="Haz clic para abrir la paleta de colores"
                  @click="bgColorInput?.click()"
                >
                  <div class="flex items-center gap-2.5">
                    <span
                      class="w-7 h-7 rounded-lg neu-swatch shrink-0"
                      :style="{ backgroundColor: uiStore.backgroundColor }"
                    />
                    <span class="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                      Elegir color
                    </span>
                  </div>
                  <Pipette class="w-4 h-4 text-[var(--text-secondary)] group-hover:text-[var(--accent)] transition-colors" />
                  <input
                    ref="bgColorInput"
                    type="color"
                    :value="uiStore.backgroundColor"
                    class="sr-only"
                    @input="updateBackgroundColor(($event.target as HTMLInputElement).value)"
                  />
                </button>

                <!-- Campo HEX hundido editable con icono de lápiz -->
                <label
                  class="neu-well-sm px-3 py-2 rounded-xl flex items-center justify-between gap-2 cursor-text"
                  title="Escribe o pega un código de color HEX"
                >
                  <span class="text-[10px] uppercase font-mono font-semibold text-[var(--text-muted)]">HEX</span>
                  <input
                    type="text"
                    :value="uiStore.backgroundColor"
                    maxlength="7"
                    class="w-full bg-transparent text-xs font-mono font-bold text-center text-[var(--text-primary)] focus:outline-none"
                    @change="updateBackgroundColor(($event.target as HTMLInputElement).value)"
                  />
                  <Pencil class="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                </label>

                <!-- Muestras rápidas neumórficas -->
                <div class="flex items-center justify-between pt-1">
                  <button
                    v-for="swatch in bgSwatches"
                    :key="swatch"
                    type="button"
                    class="w-6 h-6 rounded-full neu-swatch flex items-center justify-center cursor-pointer"
                    :class="{ 'is-selected': uiStore.backgroundColor.toUpperCase() === swatch.toUpperCase() }"
                    :style="{ backgroundColor: swatch }"
                    @click="updateBackgroundColor(swatch)"
                  >
                    <Check
                      v-if="uiStore.backgroundColor.toUpperCase() === swatch.toUpperCase()"
                      class="w-3 h-3 text-[var(--accent)] drop-shadow"
                    />
                  </button>
                </div>
              </div>
            </div>

            <!-- Control sencillo de intensidad de gamas del fondo -->
            <div class="neu-well px-4 py-3 rounded-2xl flex items-center justify-between gap-4">
              <span class="text-xs font-semibold text-[var(--text-secondary)]">
                Intensidad de capas del fondo
              </span>
              <div class="flex items-center gap-3">
                <input
                  type="range"
                  min="50"
                  max="150"
                  step="5"
                  :value="uiStore.bgFilterIntensity"
                  class="w-36 accent-[var(--accent)] cursor-pointer"
                  @input="updateFilterIntensity"
                />
                <span class="neu-btn px-2.5 py-1 rounded-lg font-mono text-xs font-bold text-[var(--accent)] min-w-[3.4rem] text-center">
                  {{ uiStore.bgFilterIntensity }}%
                </span>
              </div>
            </div>

            <!-- Temas Predefinidos: 3 Claros y 3 Oscuros con relieve neumórfico -->
            <div class="space-y-4">
              <!-- 3 Modo Claro -->
              <div class="space-y-2.5">
                <div class="flex items-center gap-1.5 text-xs font-bold text-[var(--text-secondary)]">
                  <Sun class="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span>Temas claros</span>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    v-for="preset in lightPresets"
                    :key="preset.id"
                    type="button"
                    class="neu-preset-btn p-3.5 rounded-2xl border text-left flex items-center justify-between cursor-pointer"
                    :class="{ 'is-active': activePresetId === preset.id }"
                    :style="{
                      backgroundColor: preset.backgroundColor,
                      color: preset.textColor,
                      borderColor:
                        activePresetId === preset.id
                          ? preset.buttonColor
                          : 'rgba(128,128,128,0.25)'
                    }"
                    @click="uiStore.applyPreset(preset)"
                  >
                    <div class="flex items-center gap-1.5 min-w-0 pr-2">
                      <span class="text-xs font-bold truncate">{{ preset.name }}</span>
                      <Check
                        v-if="activePresetId === preset.id"
                        class="w-3.5 h-3.5 shrink-0"
                        :style="{ color: preset.buttonColor }"
                      />
                    </div>

                    <div class="flex items-center -space-x-1 shrink-0">
                      <span
                        class="w-4 h-4 rounded-full border border-white/60 shadow-sm"
                        :style="{ backgroundColor: preset.buttonColor }"
                      />
                      <span
                        class="w-4 h-4 rounded-full border border-white/60 shadow-sm"
                        :style="{ backgroundColor: preset.textColor }"
                      />
                      <span
                        class="w-4 h-4 rounded-full border border-black/20 shadow-sm"
                        :style="{ backgroundColor: preset.backgroundColor }"
                      />
                    </div>
                  </button>
                </div>
              </div>

              <!-- 3 Modo Oscuro -->
              <div class="space-y-2.5">
                <div class="flex items-center gap-1.5 text-xs font-bold text-[var(--text-secondary)]">
                  <Moon class="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span>Temas oscuros</span>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    v-for="preset in darkPresets"
                    :key="preset.id"
                    type="button"
                    class="neu-preset-btn p-3.5 rounded-2xl border text-left flex items-center justify-between cursor-pointer"
                    :class="{ 'is-active': activePresetId === preset.id }"
                    :style="{
                      backgroundColor: preset.backgroundColor,
                      color: preset.textColor,
                      borderColor:
                        activePresetId === preset.id
                          ? preset.buttonColor
                          : 'rgba(255,255,255,0.16)'
                    }"
                    @click="uiStore.applyPreset(preset)"
                  >
                    <div class="flex items-center gap-1.5 min-w-0 pr-2">
                      <span class="text-xs font-bold truncate">{{ preset.name }}</span>
                      <Check
                        v-if="activePresetId === preset.id"
                        class="w-3.5 h-3.5 shrink-0"
                        :style="{ color: preset.buttonColor }"
                      />
                    </div>

                    <div class="flex items-center -space-x-1 shrink-0">
                      <span
                        class="w-4 h-4 rounded-full border border-black/50 shadow-sm"
                        :style="{ backgroundColor: preset.buttonColor }"
                      />
                      <span
                        class="w-4 h-4 rounded-full border border-black/50 shadow-sm"
                        :style="{ backgroundColor: preset.textColor }"
                      />
                      <span
                        class="w-4 h-4 rounded-full border border-white/30 shadow-sm"
                        :style="{ backgroundColor: preset.backgroundColor }"
                      />
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-end px-6 py-4 border-t border-[var(--border-subtle)] bg-[var(--bg-base)]/50">
            <button
              type="button"
              class="neu-btn-terracotta px-6 py-2.5 rounded-xl text-xs font-semibold cursor-pointer"
              @click="uiStore.closeThemeModal()"
            >
              Listo
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

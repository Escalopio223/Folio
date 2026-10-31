<script setup lang="ts">
import { ref } from 'vue'
import { onClickOutside } from '@vueuse/core'
import type { Editor } from '@tiptap/vue-3'
import { Radio, ChevronDown, Check, SlidersHorizontal, Globe } from 'lucide-vue-next'
import { useEchoRadar } from '../../composables/useEchoRadar'
import type { SupportedLanguageCode } from '../../nlp/types'

const props = defineProps<{
  editor: Editor | null | undefined
}>()

const {
  isRadarEnabled,
  windowSizeWords,
  minRepetitions,
  radarLanguage,
  clustersCount,
  detectedLanguageName,
  toggleRadar: toggleRadarState,
  setWindowSize: setWindowSizeState,
  setMinRepetitions: setMinRepetitionsState,
  setLanguage: setLanguageState
} = useEchoRadar()

const isSettingsOpen = ref(false)
const settingsDropdownRef = ref<HTMLElement | null>(null)

onClickOutside(settingsDropdownRef, () => {
  if (isSettingsOpen.value) {
    isSettingsOpen.value = false
  }
})

function handleToggle(): void {
  toggleRadarState()
  if (props.editor) {
    props.editor.commands.setEchoRadarConfig({
      enabled: isRadarEnabled.value
    })
  }
}

function handleSelectWindowSize(size: 60 | 120 | 250): void {
  setWindowSizeState(size)
  if (props.editor) {
    props.editor.commands.setEchoRadarConfig({
      windowSizeWords: size
    })
  }
}

function handleSelectTolerance(reps: 2 | 3): void {
  setMinRepetitionsState(reps)
  if (props.editor) {
    props.editor.commands.setEchoRadarConfig({
      minRepetitions: reps
    })
  }
}

async function handleSelectLanguage(lang: SupportedLanguageCode): Promise<void> {
  setLanguageState(lang)
  if (props.editor) {
    props.editor.commands.setEchoRadarConfig({
      language: lang
    })
  }

  // Sincronizar corrector ortográfico nativo multilingüe
  if (window.api?.spellcheck) {
    try {
      if (lang === 'en') {
        await window.api.spellcheck.setLanguages(['en-US'])
      } else if (lang === 'es') {
        await window.api.spellcheck.setLanguages(['es-ES'])
      } else {
        await window.api.spellcheck.setLanguages(['es-ES', 'en-US'])
      }
    } catch {
      // Ignorar si el sistema no soporta cambio en caliente
    }
  }
}
</script>

<template>
  <div ref="settingsDropdownRef" class="relative inline-flex items-center shrink-0">
    <!-- Grupo de Botón Principal y Desplegable -->
    <div
      class="inline-flex items-center rounded-lg overflow-hidden transition-all"
      :class="[
        isRadarEnabled
          ? 'neu-well bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30'
          : 'neu-btn text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
      ]"
    >
      <!-- Botón de Activación / Desactivación -->
      <button
        type="button"
        class="h-7 px-2 flex items-center gap-1.5 text-xs transition-colors cursor-pointer select-none"
        :title="isRadarEnabled ? 'Desactivar Radar de Ecos' : 'Activar Radar de Ecos (Repeticiones léxicas)'"
        @mousedown.prevent
        @click="handleToggle"
      >
        <Radio
          :size="13"
          :class="[
            isRadarEnabled
              ? 'text-[var(--accent)] animate-pulse'
              : 'text-[var(--text-muted)]'
          ]"
        />
        <span class="text-[11px] font-medium hidden sm:inline">Radar</span>

        <!-- Badge de Clústeres Detectados cuando está activo -->
        <span
          v-if="isRadarEnabled"
          class="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold neu-surface text-[var(--accent)]"
        >
          {{ clustersCount }} {{ clustersCount === 1 ? 'eco' : 'ecos' }}
        </span>
      </button>

      <!-- Botón Desplegable de Ajustes -->
      <button
        type="button"
        class="h-7 px-1.5 flex items-center justify-center transition-colors hover:bg-[var(--accent)]/15 cursor-pointer border-l border-[var(--groove-dark)]/25"
        :class="{ '!bg-[var(--accent)]/20': isSettingsOpen }"
        title="Ajustes del Radar de Ecos (Radio, Tolerancia, Idioma)"
        @mousedown.prevent
        @click="isSettingsOpen = !isSettingsOpen"
      >
        <ChevronDown
          :size="11"
          class="transition-transform duration-150"
          :class="{ 'rotate-180': isSettingsOpen }"
        />
      </button>
    </div>

    <!-- Menú Desplegable de Configuración Rápida -->
    <Transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-75 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="isSettingsOpen"
        class="absolute right-0 top-full mt-1.5 z-50 neu-surface p-3 min-w-[240px] shadow-2xl border border-[var(--groove-dark)]/50 rounded-xl space-y-3 select-none text-[var(--text-primary)]"
      >
        <div class="flex items-center justify-between pb-1.5 border-b border-[var(--groove-dark)]/30">
          <span class="text-xs font-bold flex items-center gap-1.5 text-[var(--text-primary)]">
            <SlidersHorizontal :size="12" class="text-[var(--accent)]" />
            Ajustes del Radar de Ecos
          </span>
          <span class="text-[10px] font-mono text-[var(--text-muted)]">
            {{ isRadarEnabled ? 'Activo' : 'Pausado' }}
          </span>
        </div>

        <!-- 1. Radio de Ventana Deslizante -->
        <div class="space-y-1">
          <label class="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">
            Radio de Detección
          </label>
          <div class="grid grid-cols-3 gap-1">
            <button
              type="button"
              class="neu-btn px-1.5 py-1 text-[11px] rounded-md transition-all cursor-pointer text-center"
              :class="{ 'neu-well !text-[var(--accent)] font-bold': windowSizeWords === 60 }"
              title="Estricto: 60 palabras (~1 párrafo)"
              @click="handleSelectWindowSize(60)"
            >
              60p
              <span class="block text-[8px] opacity-70">Estricto</span>
            </button>
            <button
              type="button"
              class="neu-btn px-1.5 py-1 text-[11px] rounded-md transition-all cursor-pointer text-center"
              :class="{ 'neu-well !text-[var(--accent)] font-bold': windowSizeWords === 120 }"
              title="Medio: 120 palabras (~2 párrafos por defecto)"
              @click="handleSelectWindowSize(120)"
            >
              120p
              <span class="block text-[8px] opacity-70">Medio</span>
            </button>
            <button
              type="button"
              class="neu-btn px-1.5 py-1 text-[11px] rounded-md transition-all cursor-pointer text-center"
              :class="{ 'neu-well !text-[var(--accent)] font-bold': windowSizeWords === 250 }"
              title="Amplio: 250 palabras"
              @click="handleSelectWindowSize(250)"
            >
              250p
              <span class="block text-[8px] opacity-70">Amplio</span>
            </button>
          </div>
        </div>

        <!-- 2. Tolerancia de Repeticiones -->
        <div class="space-y-1">
          <label class="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">
            Tolerancia Mínima
          </label>
          <div class="grid grid-cols-2 gap-1">
            <button
              type="button"
              class="neu-btn px-2 py-1 text-[11px] rounded-md transition-all cursor-pointer text-center"
              :class="{ 'neu-well !text-[var(--accent)] font-bold': minRepetitions === 2 }"
              title="Avisa a partir de 2 repeticiones en el radio"
              @click="handleSelectTolerance(2)"
            >
              2+ repeticiones
            </button>
            <button
              type="button"
              class="neu-btn px-2 py-1 text-[11px] rounded-md transition-all cursor-pointer text-center"
              :class="{ 'neu-well !text-[var(--accent)] font-bold': minRepetitions === 3 }"
              title="Avisa sólo a partir de 3 repeticiones en el radio"
              @click="handleSelectTolerance(3)"
            >
              3+ repeticiones
            </button>
          </div>
        </div>

        <!-- 3. Idioma / Diccionario de Sinónimos -->
        <div class="space-y-1 pt-1 border-t border-[var(--groove-dark)]/30">
          <label class="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider flex items-center justify-between">
            <span class="flex items-center gap-1">
              <Globe :size="10" />
              Idioma / Diccionario
            </span>
            <span v-if="radarLanguage === 'auto'" class="text-[9px] text-[var(--accent)] font-sans lowercase">
              {{ detectedLanguageName }}
            </span>
          </label>
          <div class="grid grid-cols-2 gap-1">
            <button
              type="button"
              class="neu-btn px-2 py-1 text-[10px] rounded-md transition-all cursor-pointer flex items-center justify-between"
              :class="{ 'neu-well !text-[var(--accent)] font-bold': radarLanguage === 'auto' }"
              @click="handleSelectLanguage('auto')"
            >
              <span>Auto</span>
              <Check v-if="radarLanguage === 'auto'" :size="10" />
            </button>
            <button
              type="button"
              class="neu-btn px-2 py-1 text-[10px] rounded-md transition-all cursor-pointer flex items-center justify-between"
              :class="{ 'neu-well !text-[var(--accent)] font-bold': radarLanguage === 'es' }"
              @click="handleSelectLanguage('es')"
            >
              <span>Español</span>
              <Check v-if="radarLanguage === 'es'" :size="10" />
            </button>
            <button
              type="button"
              class="neu-btn px-2 py-1 text-[10px] rounded-md transition-all cursor-pointer flex items-center justify-between"
              :class="{ 'neu-well !text-[var(--accent)] font-bold': radarLanguage === 'en' }"
              @click="handleSelectLanguage('en')"
            >
              <span>English</span>
              <Check v-if="radarLanguage === 'en'" :size="10" />
            </button>
            <button
              type="button"
              class="neu-btn px-2 py-1 text-[10px] rounded-md transition-all cursor-pointer flex items-center justify-between"
              :class="{ 'neu-well !text-[var(--accent)] font-bold': radarLanguage === 'universal' }"
              @click="handleSelectLanguage('universal')"
            >
              <span>Universal</span>
              <Check v-if="radarLanguage === 'universal'" :size="10" />
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

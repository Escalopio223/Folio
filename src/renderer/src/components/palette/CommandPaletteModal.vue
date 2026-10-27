<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted, type Component } from 'vue'
import {
  Search,
  Bookmark,
  FileText,
  User,
  MapPin,
  Box,
  Lightbulb,
  Sparkles,
  Command,
  CornerDownLeft,
  ArrowUpDown
} from 'lucide-vue-next'
import { onClickOutside } from '@vueuse/core'
import { usePaletteStore } from '../../stores/paletteStore'
import { useUiStore } from '../../stores/uiStore'
import { useFolioStore } from '../../stores/folioStore'
import { useLoreStore } from '../../stores/loreStore'
import { useProjectStore } from '../../stores/projectStore'
import { useTrashStore } from '../../stores/trashStore'
import { getSystemCommands, type CommandAction } from './commandsRegistry'

const paletteStore = usePaletteStore()
const uiStore = useUiStore()
const folioStore = useFolioStore()
const loreStore = useLoreStore()
const projectStore = useProjectStore()
const trashStore = useTrashStore()

const inputRef = ref<HTMLInputElement | null>(null)
const modalRef = ref<HTMLElement | null>(null)

// Cerrar al hacer clic en el backdrop fuera del modal
onClickOutside(modalRef, () => {
  if (paletteStore.isOpen) {
    paletteStore.close()
  }
})

// Normalizador de texto para búsqueda flexible e insensible a mayúsculas y tildes
function normalize(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

// Extractor de snippet de contenido contextual
function extractSnippet(rawText: string, query: string, maxLength = 65): string {
  const clean = (rawText || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!clean) return ''
  if (!query) return clean.slice(0, maxLength) + (clean.length > maxLength ? '…' : '')

  const normClean = normalize(clean)
  const normQuery = normalize(query)
  const matchIndex = normClean.indexOf(normQuery)

  if (matchIndex === -1) {
    return clean.slice(0, maxLength) + (clean.length > maxLength ? '…' : '')
  }

  const start = Math.max(0, matchIndex - 20)
  const end = Math.min(clean.length, matchIndex + query.length + 45)
  const snippet = clean.slice(start, end).trim()

  return (start > 0 ? '…' : '') + snippet + (end < clean.length ? '…' : '')
}

// Icono según categoría de Lore
function getLoreCategoryIcon(category: string): Component {
  const c = category.toLowerCase()
  if (c.includes('personaje')) return User
  if (c.includes('lugar')) return MapPin
  if (c.includes('objeto')) return Box
  if (c.includes('idea') || c.includes('pensamiento')) return Lightbulb
  return Sparkles
}

// Tipos unificados para los resultados de la paleta
export interface PaletteItem {
  id: string
  title: string
  description?: string
  snippet?: string
  section: 'action' | 'manuscript' | 'lore'
  badge: string
  icon: Component
  shortcut?: string
  execute: () => void | Promise<void>
}

// 1. Acciones del sistema
const systemCommands = computed<CommandAction[]>(() => {
  return getSystemCommands({
    uiStore,
    folioStore,
    loreStore,
    projectStore,
    trashStore
  })
})

const filteredActions = computed<PaletteItem[]>(() => {
  const q = normalize(paletteStore.query)
  let list = systemCommands.value

  if (q) {
    list = list.filter((cmd) => {
      const matchTitle = normalize(cmd.title).includes(q)
      const matchDesc = normalize(cmd.description).includes(q)
      const matchKeywords = (cmd.keywords || []).some((k) => normalize(k).includes(q))
      const matchShortcut = cmd.shortcut ? normalize(cmd.shortcut).includes(q) : false
      return matchTitle || matchDesc || matchKeywords || matchShortcut
    })
  }

  return list.map((cmd) => ({
    id: `action-${cmd.id}`,
    title: cmd.title,
    description: cmd.description,
    section: 'action',
    badge: cmd.badge,
    icon: cmd.icon,
    shortcut: cmd.shortcut,
    execute: cmd.execute
  }))
})

// 2. Manuscrito (Capítulos y Escenas)
const filteredManuscript = computed<PaletteItem[]>(() => {
  const q = normalize(paletteStore.query)
  const folios = folioStore.folios.filter((f) => !f.isArchived)

  if (!q) {
    // Si la búsqueda está vacía, mostramos los capítulos principales y escenas destacadas
    return folios.slice(0, 6).map((f) => {
      const isChapter = f.parentId === null
      return {
        id: `folio-${f.id}`,
        title: f.title || (isChapter ? 'Capítulo sin título' : 'Escena sin título'),
        description: isChapter
          ? `Capítulo #${f.sortOrder}`
          : `Escena del capítulo`,
        snippet: extractSnippet(f.synopsis || f.content, ''),
        section: 'manuscript',
        badge: isChapter ? 'Capítulo' : 'Escena',
        icon: isChapter ? Bookmark : FileText,
        execute: () => {
          folioStore.selectFolio(f.id)
          uiStore.setLeftSidebar(true)
        }
      }
    })
  }

  const results: PaletteItem[] = []
  for (const f of folios) {
    const isChapter = f.parentId === null
    const matchTitle = normalize(f.title).includes(q)
    const matchSynopsis = normalize(f.synopsis || '').includes(q)
    const plainContent = (f.content || '').replace(/<[^>]*>/g, ' ')
    const matchContent = normalize(plainContent).includes(q)

    if (matchTitle || matchSynopsis || matchContent) {
      const snippet = extractSnippet(matchContent ? plainContent : f.synopsis || plainContent, paletteStore.query)
      results.push({
        id: `folio-${f.id}`,
        title: f.title || (isChapter ? 'Capítulo sin título' : 'Escena sin título'),
        description: isChapter ? `Capítulo orden #${f.sortOrder}` : `Escena de manuscrito`,
        snippet,
        section: 'manuscript',
        badge: isChapter ? 'Capítulo' : 'Escena',
        icon: isChapter ? Bookmark : FileText,
        execute: () => {
          folioStore.selectFolio(f.id)
          uiStore.setLeftSidebar(true)
        }
      })
    }
  }

  return results
})

// 3. Wiki / Lore
const filteredLore = computed<PaletteItem[]>(() => {
  const q = normalize(paletteStore.query)
  const items = loreStore.items.filter((i) => !i.isArchived)

  if (!q) {
    return items.slice(0, 5).map((item) => ({
      id: `lore-${item.id}`,
      title: item.name,
      description: item.category.toUpperCase(),
      snippet: extractSnippet(item.summary || item.content, ''),
      section: 'lore',
      badge: item.category,
      icon: getLoreCategoryIcon(item.category),
      execute: () => {
        uiStore.setRightSidebar(true)
        loreStore.selectLore(item.id)
      }
    }))
  }

  const results: PaletteItem[] = []
  for (const item of items) {
    const matchName = normalize(item.name).includes(q)
    const matchCategory = normalize(item.category).includes(q)
    const matchSummary = normalize(item.summary || '').includes(q)
    const matchContent = normalize(item.content || '').includes(q)
    const matchAttrs = Object.entries(item.attributes || {}).some(
      ([k, v]) => normalize(k).includes(q) || normalize(v).includes(q)
    )

    if (matchName || matchCategory || matchSummary || matchContent || matchAttrs) {
      const snippet = extractSnippet(item.summary || item.content, paletteStore.query)
      results.push({
        id: `lore-${item.id}`,
        title: item.name,
        description: item.category.toUpperCase(),
        snippet,
        section: 'lore',
        badge: item.category,
        icon: getLoreCategoryIcon(item.category),
        execute: () => {
          uiStore.setRightSidebar(true)
          loreStore.selectLore(item.id)
        }
      })
    }
  }

  return results
})

// Lista aplanada para navegación secuencial con flechas (ArrowDown / ArrowUp)
const allResults = computed<PaletteItem[]>(() => {
  return [
    ...filteredActions.value,
    ...filteredManuscript.value,
    ...filteredLore.value
  ]
})

// Auto-scroll del elemento activo para mantenerlo siempre a la vista
function scrollToActive(): void {
  nextTick(() => {
    const el = document.querySelector('.palette-item-active') as HTMLElement | null
    if (el) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  })
}

// Ejecutar el comando o elemento seleccionado
async function executeItem(item: PaletteItem): Promise<void> {
  paletteStore.close()
  try {
    await item.execute()
  } catch (err) {
    console.error('[CommandPalette] Error al ejecutar comando:', err)
  }
}

// Control estricto de eventos de teclado en la paleta
function handleKeydown(e: KeyboardEvent): void {
  if (!paletteStore.isOpen) return

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()
      paletteStore.selectNext(allResults.value.length)
      scrollToActive()
      break

    case 'ArrowUp':
      e.preventDefault()
      paletteStore.selectPrev(allResults.value.length)
      scrollToActive()
      break

    case 'Enter':
      e.preventDefault()
      if (allResults.value.length > 0) {
        const item = allResults.value[paletteStore.selectedIndex]
        if (item) {
          executeItem(item)
        }
      }
      break

    case 'Escape':
      e.preventDefault()
      paletteStore.close()
      break
  }
}

// Listener global de teclado (Ctrl+K / Cmd+K)
function handleGlobalKeydown(e: KeyboardEvent): void {
  const isCtrlOrCmd = e.ctrlKey || e.metaKey

  if (isCtrlOrCmd && !e.shiftKey && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    paletteStore.toggle()
  }
}

// Auto-foco inmediato al abrir la paleta
watch(
  () => paletteStore.isOpen,
  (open) => {
    if (open) {
      nextTick(() => {
        inputRef.value?.focus()
        inputRef.value?.select()
      })
    }
  }
)

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="paletteStore.isOpen"
        class="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] md:pt-[13vh] px-4 backdrop-blur-sm bg-black/40 dark:bg-black/60 select-none"
        @keydown="handleKeydown"
      >
        <!-- Contenedor Modal Flotante Neumórfico Cálido -->
        <div
          ref="modalRef"
          class="max-w-xl w-full rounded-2xl neu-surface border border-[var(--groove-dark)]/60 shadow-2xl overflow-hidden flex flex-col bg-[var(--bg-surface)] text-[var(--text-primary)]"
          role="dialog"
          aria-modal="true"
          aria-label="Paleta de Comandos y Navegación"
        >
          <!-- Barra de Entrada y Búsqueda -->
          <div class="p-3 border-b border-[var(--groove-dark)]/40">
            <div class="neu-well px-3.5 py-2.5 flex items-center gap-3 rounded-xl border border-[var(--groove-dark)]/30">
              <Search :size="16" class="text-[var(--accent)] shrink-0 opacity-90" />

              <input
                ref="inputRef"
                :value="paletteStore.query"
                type="text"
                class="bg-transparent border-none outline-none w-full text-xs md:text-sm font-sans placeholder-[var(--text-muted)] text-[var(--text-primary)] caret-[var(--accent)]"
                placeholder="Escribe una acción, capítulo, escena o personaje..."
                autocomplete="off"
                spellcheck="false"
                @input="paletteStore.setQuery(($event.target as HTMLInputElement).value)"
              />

              <kbd
                class="neu-btn px-1.5 py-0.5 text-[10px] font-mono text-[var(--text-muted)] rounded shrink-0 cursor-pointer hover:text-[var(--text-primary)]"
                title="Cerrar paleta (Escape)"
                @click="paletteStore.close"
              >
                ESC
              </kbd>
            </div>
          </div>

          <!-- Contenedor Desplazable de Resultados Agrupados -->
          <div
            class="max-h-[380px] overflow-y-auto p-2 space-y-3 custom-scrollbar focus:outline-none"
          >
            <!-- Estado Vacío -->
            <div
              v-if="allResults.length === 0"
              class="py-10 text-center flex flex-col items-center justify-center gap-2 text-[var(--text-muted)]"
            >
              <Command :size="28" class="opacity-40 stroke-[1.5]" />
              <p class="text-xs font-editorial font-medium text-[var(--text-secondary)]">
                No se encontraron resultados para "{{ paletteStore.query }}"
              </p>
              <p class="text-[11px] text-[var(--text-muted)] max-w-xs">
                Prueba buscando nombres de personajes, palabras de capítulos o comandos como "modo" o "nuevo".
              </p>
            </div>

            <!-- 1. SECCIÓN: ACCIONES DEL SISTEMA -->
            <div v-if="filteredActions.length > 0" class="space-y-1">
              <div class="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] flex items-center justify-between">
                <span>Acciones del Sistema</span>
                <span>{{ filteredActions.length }}</span>
              </div>

              <div
                v-for="item in filteredActions"
                :key="item.id"
                class="px-2.5 py-2 rounded-xl flex items-center justify-between gap-3 text-xs cursor-pointer transition-all"
                :class="{
                  'neu-well border-l-4 !border-l-[var(--accent)] font-semibold text-[var(--text-primary)] shadow-sm palette-item-active':
                    allResults[paletteStore.selectedIndex]?.id === item.id,
                  'hover:bg-[var(--bg-base)]/50 text-[var(--text-secondary)]':
                    allResults[paletteStore.selectedIndex]?.id !== item.id
                }"
                @mouseenter="paletteStore.setSelectedIndex(allResults.findIndex((r) => r.id === item.id))"
                @click="executeItem(item)"
              >
                <div class="flex items-center gap-2.5 min-w-0">
                  <div
                    class="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                    :class="allResults[paletteStore.selectedIndex]?.id === item.id ? 'text-[var(--accent)] neu-well-sm' : 'text-[var(--text-muted)] neu-surface'"
                  >
                    <component :is="item.icon" :size="13" />
                  </div>
                  <div class="min-w-0">
                    <div class="truncate text-xs text-[var(--text-primary)] font-medium">
                      {{ item.title }}
                    </div>
                    <div v-if="item.description" class="text-[10px] text-[var(--text-muted)] truncate">
                      {{ item.description }}
                    </div>
                  </div>
                </div>

                <div class="flex items-center gap-1.5 shrink-0">
                  <kbd
                    v-if="item.shortcut"
                    class="neu-well-sm px-1.5 py-0.5 text-[10px] font-mono text-[var(--text-muted)]"
                  >
                    {{ item.shortcut }}
                  </kbd>
                  <span class="neu-btn px-1.5 py-0.5 text-[9px] font-mono uppercase text-[var(--accent)] font-semibold">
                    {{ item.badge }}
                  </span>
                </div>
              </div>
            </div>

            <!-- 2. SECCIÓN: MANUSCRITO (CAPÍTULOS Y ESCENAS) -->
            <div v-if="filteredManuscript.length > 0" class="space-y-1">
              <div class="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] flex items-center justify-between border-t border-[var(--groove-dark)]/20 pt-2">
                <span>Manuscrito</span>
                <span>{{ filteredManuscript.length }}</span>
              </div>

              <div
                v-for="item in filteredManuscript"
                :key="item.id"
                class="px-2.5 py-2 rounded-xl flex items-center justify-between gap-3 text-xs cursor-pointer transition-all"
                :class="{
                  'neu-well border-l-4 !border-l-[var(--accent)] font-semibold text-[var(--text-primary)] shadow-sm palette-item-active':
                    allResults[paletteStore.selectedIndex]?.id === item.id,
                  'hover:bg-[var(--bg-base)]/50 text-[var(--text-secondary)]':
                    allResults[paletteStore.selectedIndex]?.id !== item.id
                }"
                @mouseenter="paletteStore.setSelectedIndex(allResults.findIndex((r) => r.id === item.id))"
                @click="executeItem(item)"
              >
                <div class="flex items-center gap-2.5 min-w-0">
                  <div
                    class="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                    :class="allResults[paletteStore.selectedIndex]?.id === item.id ? 'text-[var(--accent)] neu-well-sm' : 'text-[var(--text-muted)] neu-surface'"
                  >
                    <component :is="item.icon" :size="13" />
                  </div>
                  <div class="min-w-0">
                    <div class="truncate text-xs font-editorial font-bold text-[var(--text-primary)]">
                      {{ item.title }}
                    </div>
                    <div v-if="item.snippet" class="text-[10px] text-[var(--text-muted)] truncate italic">
                      {{ item.snippet }}
                    </div>
                  </div>
                </div>

                <div class="flex items-center gap-1.5 shrink-0">
                  <span class="neu-btn px-1.5 py-0.5 text-[9px] font-mono uppercase text-[var(--accent)] font-semibold">
                    {{ item.badge }}
                  </span>
                </div>
              </div>
            </div>

            <!-- 3. SECCIÓN: LORE & WIKI -->
            <div v-if="filteredLore.length > 0" class="space-y-1">
              <div class="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] flex items-center justify-between border-t border-[var(--groove-dark)]/20 pt-2">
                <span>Wiki & Lore</span>
                <span>{{ filteredLore.length }}</span>
              </div>

              <div
                v-for="item in filteredLore"
                :key="item.id"
                class="px-2.5 py-2 rounded-xl flex items-center justify-between gap-3 text-xs cursor-pointer transition-all"
                :class="{
                  'neu-well border-l-4 !border-l-[var(--accent)] font-semibold text-[var(--text-primary)] shadow-sm palette-item-active':
                    allResults[paletteStore.selectedIndex]?.id === item.id,
                  'hover:bg-[var(--bg-base)]/50 text-[var(--text-secondary)]':
                    allResults[paletteStore.selectedIndex]?.id !== item.id
                }"
                @mouseenter="paletteStore.setSelectedIndex(allResults.findIndex((r) => r.id === item.id))"
                @click="executeItem(item)"
              >
                <div class="flex items-center gap-2.5 min-w-0">
                  <div
                    class="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                    :class="allResults[paletteStore.selectedIndex]?.id === item.id ? 'text-[var(--accent)] neu-well-sm' : 'text-[var(--text-muted)] neu-surface'"
                  >
                    <component :is="item.icon" :size="13" />
                  </div>
                  <div class="min-w-0">
                    <div class="truncate text-xs font-editorial font-bold text-[var(--text-primary)]">
                      {{ item.title }}
                    </div>
                    <div v-if="item.snippet" class="text-[10px] text-[var(--text-muted)] truncate italic">
                      {{ item.snippet }}
                    </div>
                  </div>
                </div>

                <div class="flex items-center gap-1.5 shrink-0">
                  <span class="neu-btn px-1.5 py-0.5 text-[9px] font-mono uppercase text-[var(--accent)] font-semibold">
                    {{ item.badge }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Pie del Modal: Atajos de Navegación Editorial -->
          <div class="px-3.5 py-2 neu-surface border-t border-[var(--groove-dark)]/40 flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)] select-none bg-[var(--bg-base)]/60">
            <div class="flex items-center gap-3">
              <span class="flex items-center gap-1">
                <ArrowUpDown :size="12" class="opacity-70" />
                <span>Navegar</span>
              </span>

              <span class="flex items-center gap-1">
                <CornerDownLeft :size="12" class="opacity-70" />
                <span>Seleccionar</span>
              </span>
            </div>

            <div class="flex items-center gap-1 text-[10px]">
              <kbd class="neu-well-sm px-1 py-0.2">Ctrl+K</kbd>
              <span>Alternar</span>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: var(--groove-dark);
  border-radius: 9999px;
}
</style>

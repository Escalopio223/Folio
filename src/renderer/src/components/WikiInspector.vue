<script setup lang="ts">
import { ref, computed, reactive, watch, type Component } from 'vue'
import { useLoreStore } from '../stores/loreStore'
import { useProjectStore } from '../stores/projectStore'
import { useUiStore } from '../stores/uiStore'
import { useDebounceFn } from '@vueuse/core'
import {
  Compass,
  Plus,
  Search,
  X,
  ChevronDown,
  Trash2,
  Tag,
  SlidersHorizontal,
  FileText,
  User,
  MapPin,
  Box,
  Lightbulb,
  Sparkles,
  PanelRightClose
} from 'lucide-vue-next'
import type { LoreItem } from '@shared/types'

const loreStore = useLoreStore()
const projectStore = useProjectStore()
const uiStore = useUiStore()

// Búsqueda y Filtros
const searchQuery = ref('')
const expandedItemIds = reactive<Record<string, boolean>>({})

// Estado editable temporal por cada tarjeta abierta para autosave independiente
interface CardEditState {
  name: string
  category: string
  summary: string
  content: string
  attributes: Array<{ key: string; value: string }>
  newKey: string
  newValue: string
  saveStatus: 'saved' | 'saving' | 'pending'
}

const cardDrafts = reactive<Record<string, CardEditState>>({})

function getCardCategoryIcon(cat: string): Component {
  const c = cat.toLowerCase()
  if (c.includes('personaje')) return User
  if (c.includes('lugar')) return MapPin
  if (c.includes('objeto')) return Box
  if (c.includes('idea') || c.includes('pensamiento')) return Lightbulb
  return Sparkles
}

// Inicializar o sincronizar el borrador de una tarjeta
function ensureDraft(item: LoreItem): CardEditState {
  if (!cardDrafts[item.id]) {
    cardDrafts[item.id] = {
      name: item.name,
      category: item.category,
      summary: item.summary || '',
      content: item.content || '',
      attributes: Object.entries(item.attributes || {}).map(([key, value]) => ({ key, value })),
      newKey: '',
      newValue: '',
      saveStatus: 'saved'
    }
  }
  return cardDrafts[item.id]
}

// Lista filtrada por categoría y por texto de búsqueda
const displayItems = computed<LoreItem[]>(() => {
  let list = loreStore.filteredItems

  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter((item) => {
      const matchName = item.name.toLowerCase().includes(q)
      const matchCat = item.category.toLowerCase().includes(q)
      const matchSummary = (item.summary || '').toLowerCase().includes(q)
      const matchContent = (item.content || '').toLowerCase().includes(q)
      const matchAttr = Object.entries(item.attributes || {}).some(
        ([k, v]) => k.toLowerCase().includes(q) || v.toLowerCase().includes(q)
      )
      return matchName || matchCat || matchSummary || matchContent || matchAttr
    })
  }

  return list
})

function isExpanded(id: string): boolean {
  return expandedItemIds[id] === true
}

function toggleExpand(item: LoreItem): void {
  const current = isExpanded(item.id)
  expandedItemIds[item.id] = !current
  if (!current) {
    ensureDraft(item)
    loreStore.selectLore(item.id)
  }
}

// Auto-guardado debounced por tarjeta
const saveQueue: Record<string, () => void> = {}

function triggerCardSave(itemId: string): void {
  const draft = cardDrafts[itemId]
  if (!draft) return

  draft.saveStatus = 'pending'

  if (!saveQueue[itemId]) {
    saveQueue[itemId] = useDebounceFn(async () => {
      const targetDraft = cardDrafts[itemId]
      if (!targetDraft) return

      targetDraft.saveStatus = 'saving'
      const attrsObj: Record<string, string> = {}
      for (const attr of targetDraft.attributes) {
        if (attr.key.trim()) {
          attrsObj[attr.key.trim()] = attr.value.trim()
        }
      }

      await loreStore.updateLore({
        id: itemId,
        name: targetDraft.name.trim() || 'Sin nombre',
        category: targetDraft.category.trim() || 'general',
        summary: targetDraft.summary,
        content: targetDraft.content,
        attributes: attrsObj
      })

      targetDraft.saveStatus = 'saved'
    }, 600)
  }

  saveQueue[itemId]()
}

function handleAddAttribute(item: LoreItem): void {
  const draft = ensureDraft(item)
  if (!draft.newKey.trim()) return

  draft.attributes.push({
    key: draft.newKey.trim(),
    value: draft.newValue.trim()
  })
  draft.newKey = ''
  draft.newValue = ''
  triggerCardSave(item.id)
}

function handleRemoveAttribute(item: LoreItem, index: number): void {
  const draft = ensureDraft(item)
  draft.attributes.splice(index, 1)
  triggerCardSave(item.id)
}

async function handleCreateLore(): Promise<void> {
  if (!projectStore.activeProjectId) return

  const defaultCategory =
    loreStore.selectedCategory === 'todos' ? 'personaje' : loreStore.selectedCategory

  const created = await loreStore.createLore({
    projectId: projectStore.activeProjectId,
    category: defaultCategory,
    name: 'Nueva Entrada Wiki',
    summary: '',
    content: ''
  })

  if (created) {
    expandedItemIds[created.id] = true
    const draft = ensureDraft(created)
    draft.name = created.name
    draft.category = created.category
  }
}

async function handleDeleteLore(id: string): Promise<void> {
  await loreStore.moveToTrash(id)
  delete expandedItemIds[id]
  delete cardDrafts[id]
}

// Mantener drafts sincronizados si cambia el proyecto o se recarga
watch(
  () => loreStore.items,
  (newItems) => {
    for (const item of newItems) {
      if (cardDrafts[item.id] && cardDrafts[item.id].saveStatus === 'saved') {
        const d = cardDrafts[item.id]
        d.name = item.name
        d.category = item.category
        d.summary = item.summary || ''
        d.content = item.content || ''
        d.attributes = Object.entries(item.attributes || {}).map(([key, value]) => ({ key, value }))
      }
    }
  },
  { deep: true }
)
</script>

<template>
  <div class="h-full flex flex-col gap-3 min-w-0 select-none">
    <!-- Header del Inspector de Lore -->
    <div class="flex items-center justify-between gap-2 shrink-0">
      <div class="flex items-center gap-2 min-w-0">
        <div class="p-1 rounded-md neu-well-sm text-[var(--accent)] shrink-0">
          <Compass :size="15" />
        </div>
        <div class="flex flex-col min-w-0">
          <div class="flex items-center gap-1.5">
            <h3 class="font-editorial text-sm font-bold text-[var(--text-primary)] truncate">
              Wiki & Lore
            </h3>
            <span class="text-[10px] font-mono px-1.5 py-0.2 rounded neu-well-sm text-[var(--text-muted)] shrink-0">
              {{ loreStore.items.length }}
            </span>
          </div>
          <span class="text-[10px] text-[var(--text-muted)] font-mono leading-none">
            Inspector de Mundo
          </span>
        </div>
      </div>

      <!-- Acciones de Cabecera: Nueva Entrada y Ocultar Panel -->
      <div class="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          class="neu-btn-terracotta px-2.5 py-1.5 text-xs flex items-center gap-1.5 shrink-0 active:scale-95 transition-transform"
          title="Crear nueva ficha de personaje, lugar u objeto"
          @click="handleCreateLore"
        >
          <Plus :size="13" />
          <span class="font-medium text-[11px]">Nueva Ficha</span>
        </button>

        <!-- Botón explícito para ocultar Wiki & Lore -->
        <button
          type="button"
          class="neu-btn w-7 h-7 flex items-center justify-center text-[var(--text-secondary)] hover:!text-[var(--accent)] transition-all cursor-pointer"
          title="Ocultar Wiki & Lore (Ctrl+Shift+L)"
          @click="uiStore.toggleRightSidebar"
        >
          <PanelRightClose :size="13" />
        </button>
      </div>
    </div>

    <!-- Barra de Búsqueda Rápida en Vivo -->
    <div class="relative shrink-0">
      <div class="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-[var(--text-muted)]">
        <Search :size="12" />
      </div>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Buscar personaje, lugar, rasgo..."
        class="w-full pl-8 pr-7 py-1.5 text-xs neu-well-sm bg-transparent border-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/60 focus:outline-none"
      />
      <button
        v-if="searchQuery"
        type="button"
        class="absolute inset-y-0 right-0 pr-2 flex items-center text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        @click="searchQuery = ''"
      >
        <X :size="12" />
      </button>
    </div>

    <!-- Filtro de Categorías Dinámicas con Píldoras -->
    <div class="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-[11px] shrink-0">
      <button
        type="button"
        class="px-2 py-0.5 rounded-lg shrink-0 transition-all font-medium"
        :class="
          loreStore.selectedCategory === 'todos'
            ? 'neu-btn is-active text-[var(--accent)] font-bold'
            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
        "
        @click="loreStore.selectedCategory = 'todos'"
      >
        Todos
      </button>

      <button
        v-for="cat in loreStore.categories"
        :key="cat"
        type="button"
        class="px-2 py-0.5 rounded-lg shrink-0 transition-all capitalize"
        :class="
          loreStore.selectedCategory === cat
            ? 'neu-btn is-active text-[var(--accent)] font-bold'
            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
        "
        @click="loreStore.selectedCategory = cat"
      >
        {{ cat }}
      </button>
    </div>

    <div class="neu-groove-h"></div>

    <!-- Lista de Tarjetas Acordeón Desplegables -->
    <div class="flex-1 overflow-y-auto space-y-2 pr-1 editorial-scrollbar">
      <div
        v-for="item in displayItems"
        :key="item.id"
        class="neu-surface overflow-hidden transition-all duration-200 border"
        :class="
          isExpanded(item.id)
            ? 'border-l-4 border-l-[var(--accent)] border-t-[var(--groove-light)] border-r-[var(--groove-light)] border-b-[var(--groove-light)] shadow-md'
            : 'border-[var(--groove-light)] hover:border-[var(--accent)]/40'
        "
      >
        <!-- CABECERA DEL ACORDEÓN (Siempre visible, clic para colapsar/desplegar) -->
        <div
          class="p-2.5 flex items-center justify-between gap-2 cursor-pointer select-none transition-colors"
          :class="isExpanded(item.id) ? 'bg-[var(--bg-surface)]' : 'hover:bg-[var(--bg-base)]/40'"
          @click="toggleExpand(item)"
        >
          <div class="flex items-center gap-2 min-w-0">
            <!-- Icono de categoría -->
            <div
              class="w-6 h-6 rounded flex items-center justify-center shrink-0 text-[var(--accent)]"
              :class="isExpanded(item.id) ? 'neu-well-sm' : 'neu-surface'"
            >
              <component :is="getCardCategoryIcon(item.category)" :size="13" />
            </div>

            <div class="min-w-0">
              <div class="flex items-center gap-1.5">
                <span class="font-editorial text-xs font-bold text-[var(--text-primary)] truncate">
                  {{ item.name }}
                </span>
                <span class="text-[9px] font-mono uppercase px-1 py-0.2 rounded neu-well-sm text-[var(--accent)] shrink-0">
                  {{ item.category }}
                </span>
              </div>
              <p
                v-if="!isExpanded(item.id) && item.summary"
                class="text-[10px] text-[var(--text-muted)] truncate mt-0.5 italic"
              >
                {{ item.summary }}
              </p>
            </div>
          </div>

          <!-- Acciones de cabecera -->
          <div class="flex items-center gap-1 shrink-0" @click.stop>
            <span
              v-if="Object.keys(item.attributes || {}).length > 0"
              class="text-[9px] font-mono px-1 py-0.5 rounded text-[var(--text-muted)] opacity-75"
              title="Atributos definidos"
            >
              {{ Object.keys(item.attributes || {}).length }} atr
            </span>

            <button
              type="button"
              class="p-1 text-[var(--text-muted)] hover:text-rose-400 transition-colors opacity-60 hover:opacity-100"
              title="Mover a la papelera"
              @click="handleDeleteLore(item.id)"
            >
              <Trash2 :size="12" />
            </button>

            <button
              type="button"
              class="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-transform duration-200"
              :class="{ 'rotate-180': isExpanded(item.id) }"
              @click="toggleExpand(item)"
            >
              <ChevronDown :size="14" />
            </button>
          </div>
        </div>

        <!-- CUERPO EXPANDIDO DEL ACORDEÓN (Despliegue hacia abajo con atributos y biografía) -->
        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="max-h-0 opacity-0 overflow-hidden"
          enter-to-class="max-h-[800px] opacity-100 overflow-hidden"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="max-h-[800px] opacity-100 overflow-hidden"
          leave-to-class="max-h-0 opacity-0 overflow-hidden"
        >
          <div
            v-if="isExpanded(item.id) && cardDrafts[item.id]"
            class="px-3 pb-3 pt-1 border-t border-[var(--groove-dark)]/30 space-y-3 bg-[var(--bg-base)]/30"
          >
            <!-- Edición de Nombre y Categoría -->
            <div class="space-y-1.5 pt-1">
              <input
                v-model="cardDrafts[item.id].name"
                type="text"
                placeholder="Nombre del personaje o entidad..."
                class="w-full font-editorial text-sm font-bold text-[var(--text-primary)] bg-transparent border-none focus:outline-none placeholder:text-[var(--text-muted)]/60"
                @input="triggerCardSave(item.id)"
              />

              <div class="flex items-center gap-1.5">
                <div class="neu-well-sm px-2 py-0.5 flex items-center gap-1 text-[10px] text-[var(--accent)] shrink-0">
                  <Tag :size="11" />
                  <input
                    v-model="cardDrafts[item.id].category"
                    type="text"
                    placeholder="Categoría"
                    class="bg-transparent border-none focus:outline-none capitalize text-[10px] font-mono text-[var(--accent)] w-24"
                    @input="triggerCardSave(item.id)"
                  />
                </div>

                <input
                  v-model="cardDrafts[item.id].summary"
                  type="text"
                  placeholder="Resumen o rol breve..."
                  class="flex-1 text-[11px] italic text-[var(--text-secondary)] bg-transparent border-none focus:outline-none placeholder:text-[var(--text-muted)]/50"
                  @input="triggerCardSave(item.id)"
                />
              </div>
            </div>

            <!-- Sección de Atributos Clave-Valor Dinámicos -->
            <div class="neu-well p-2.5 space-y-2 rounded-lg">
              <div class="flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)]">
                <span class="flex items-center gap-1 font-semibold text-[var(--text-secondary)]">
                  <SlidersHorizontal :size="11" class="text-[var(--accent)]" />
                  <span>Atributos Clave-Valor</span>
                </span>
                <span>{{ cardDrafts[item.id].attributes.length }} definidos</span>
              </div>

              <!-- Chips de atributos existentes -->
              <div
                v-if="cardDrafts[item.id].attributes.length > 0"
                class="flex flex-wrap gap-1.5"
              >
                <div
                  v-for="(attr, idx) in cardDrafts[item.id].attributes"
                  :key="idx"
                  class="neu-well-sm px-2 py-0.5 text-[11px] flex items-center gap-1.5 group bg-[var(--bg-surface)]"
                >
                  <span class="font-semibold text-[var(--accent)] text-[10px] font-mono">{{ attr.key }}:</span>
                  <span class="text-[var(--text-primary)] text-[11px]">{{ attr.value }}</span>
                  <button
                    type="button"
                    class="text-[var(--text-muted)] hover:text-rose-400 opacity-60 group-hover:opacity-100 transition-opacity ml-0.5"
                    title="Eliminar atributo"
                    @click="handleRemoveAttribute(item, idx)"
                  >
                    <X :size="10" />
                  </button>
                </div>
              </div>

              <!-- Input para agregar nuevo atributo -->
              <div class="flex items-center gap-1.5 pt-1">
                <input
                  v-model="cardDrafts[item.id].newKey"
                  type="text"
                  placeholder="Propiedad (ej. Edad)"
                  class="neu-well-sm px-2 py-1 text-[11px] bg-transparent border-none text-[var(--text-primary)] focus:outline-none w-28 shrink-0"
                  @keydown.enter.prevent="handleAddAttribute(item)"
                />
                <input
                  v-model="cardDrafts[item.id].newValue"
                  type="text"
                  placeholder="Valor (ej. 32 años)"
                  class="neu-well-sm px-2 py-1 text-[11px] bg-transparent border-none text-[var(--text-primary)] focus:outline-none flex-1 min-w-0"
                  @keydown.enter.prevent="handleAddAttribute(item)"
                />
                <button
                  type="button"
                  class="neu-btn px-2 py-1 text-[10px] text-[var(--accent)] font-semibold flex items-center gap-0.5 shrink-0"
                  @click="handleAddAttribute(item)"
                >
                  <Plus :size="10" />
                  <span>Añadir</span>
                </button>
              </div>
            </div>

            <!-- Notas Biográficas y Lore Detallado -->
            <div class="space-y-1">
              <label class="text-[10px] font-mono text-[var(--text-muted)] flex items-center gap-1">
                <FileText :size="10" />
                <span>Notas Biográficas & Detalles:</span>
              </label>
              <textarea
                v-model="cardDrafts[item.id].content"
                placeholder="Antecedentes, rasgos de personalidad, relaciones o historia..."
                rows="4"
                class="w-full neu-well p-2 text-xs leading-relaxed text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/50 bg-transparent border-none resize-none focus:outline-none select-text caret-[var(--accent)] font-editorial"
                @input="triggerCardSave(item.id)"
              ></textarea>
            </div>

            <!-- Footer de la Tarjeta: Estado de Guardado -->
            <div class="flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)] pt-1">
              <span class="flex items-center gap-1.5">
                <span
                  class="w-1.5 h-1.5 rounded-full"
                  :class="{
                    'bg-amber-400': cardDrafts[item.id].saveStatus === 'pending',
                    'bg-[var(--accent)] animate-pulse': cardDrafts[item.id].saveStatus === 'saving',
                    'bg-emerald-500': cardDrafts[item.id].saveStatus === 'saved'
                  }"
                ></span>
                <span>
                  {{
                    cardDrafts[item.id].saveStatus === 'saving'
                      ? 'Guardando...'
                      : cardDrafts[item.id].saveStatus === 'pending'
                        ? 'Cambios pendientes...'
                        : 'Guardado en SQLite'
                  }}
                </span>
              </span>

              <button
                type="button"
                class="text-[10px] text-[var(--text-muted)] hover:text-rose-400 transition-colors"
                @click="handleDeleteLore(item.id)"
              >
                Eliminar ficha
              </button>
            </div>
          </div>
        </Transition>
      </div>

      <!-- Empty State cuando no hay entradas -->
      <div
        v-if="displayItems.length === 0"
        class="h-44 flex flex-col items-center justify-center text-center p-4 text-[var(--text-muted)] space-y-2 neu-well rounded-xl"
      >
        <Compass :size="24" class="opacity-40" />
        <p class="text-xs">
          {{ searchQuery ? `Sin resultados para "${searchQuery}"` : 'No hay entradas en esta categoría' }}
        </p>
        <button
          type="button"
          class="text-xs text-[var(--accent)] font-medium hover:underline cursor-pointer"
          @click="handleCreateLore"
        >
          Crear nueva ficha de wiki
        </button>
      </div>
    </div>

    <!-- Pie del Inspector -->
    <div class="neu-groove-h"></div>
    <div class="flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)] shrink-0">
      <span>{{ displayItems.length }} visibles</span>
      <span>Consulta rápida al escribir</span>
    </div>
  </div>
</template>

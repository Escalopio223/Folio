<script setup lang="ts">
import { ref, computed, reactive, watch, nextTick, type Component } from 'vue'
import { useLoreStore } from '../stores/loreStore'
import { useProjectStore } from '../stores/projectStore'
import { useUiStore } from '../stores/uiStore'
import { useRulesStore } from '../stores/rulesStore'
import { useDebounceFn } from '@vueuse/core'
import {
  Compass,
  Scale,
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
  GripVertical
} from 'lucide-vue-next'
import type { LoreItem } from '@shared/types'
import WorldRulesList from './rules/WorldRulesList.vue'
import ColorTagPicker from './common/ColorTagPicker.vue'
import { modKey } from '../utils/platform'

const loreStore = useLoreStore()
const projectStore = useProjectStore()
const uiStore = useUiStore()
const rulesStore = useRulesStore()

// Búsqueda y Filtros
const searchQuery = ref('')
const expandedItemIds = reactive<Record<string, boolean>>({})

// =========================================================================
// DRAG & DROP DE FICHAS DE WIKI
// =========================================================================
const draggedLoreId = ref<string | null>(null)
const dragOverLoreId = ref<string | null>(null)

function onDragStartLore(e: DragEvent, loreId: string): void {
  const target = e.target as HTMLElement | null
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
    e.preventDefault()
    return
  }
  draggedLoreId.value = loreId
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', loreId)
  }
}

function onDragOverLore(e: DragEvent, loreId: string): void {
  e.preventDefault()
  if (draggedLoreId.value && draggedLoreId.value !== loreId) {
    dragOverLoreId.value = loreId
  }
}

function onDragLeaveLore(loreId: string): void {
  if (dragOverLoreId.value === loreId) {
    dragOverLoreId.value = null
  }
}

async function onDropLore(e: DragEvent, targetLoreId: string): Promise<void> {
  e.preventDefault()
  const sourceId = draggedLoreId.value
  draggedLoreId.value = null
  dragOverLoreId.value = null

  if (!sourceId || sourceId === targetLoreId) return

  // Lista global de items para reordenar
  const currentList = [...loreStore.items.map((i) => i.id)]
  const sourceIdx = currentList.indexOf(sourceId)
  const targetIdx = currentList.indexOf(targetLoreId)

  if (sourceIdx === -1 || targetIdx === -1) return

  currentList.splice(sourceIdx, 1)
  const newTargetIdx = currentList.indexOf(targetLoreId)
  currentList.splice(newTargetIdx, 0, sourceId)

  await loreStore.reorderLore(currentList)
}

function onDragEndLore(): void {
  draggedLoreId.value = null
  dragOverLoreId.value = null
}

// Estado editable temporal por cada tarjeta abierta para autosave independiente
interface CardEditState {
  name: string
  category: string
  summary: string
  content: string
  aliases: string[]
  newAlias: string
  attributes: Array<{ key: string; value: string }>
  newKey: string
  newValue: string
  colorTag: string | null
  saveStatus: 'saved' | 'saving' | 'pending'
}

const cardDrafts = reactive<Record<string, CardEditState>>({})

function getCardCategoryIcon(cat: string): Component {
  const c = cat.toLowerCase()
  if (c.includes('personaje')) return User
  if (c.includes('lugar')) return MapPin
  if (c.includes('objeto')) return Box
  if (c.includes('idea') || c.includes('pensamiento')) return Lightbulb
  if (c.includes('regla') || c.includes('ley') || c.includes('sistema') || c.includes('codigo')) return Scale
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
      aliases: Array.isArray(item.aliases) ? [...item.aliases] : [],
      newAlias: '',
      attributes: Object.entries(item.attributes || {}).map(([key, value]) => ({ key, value })),
      newKey: '',
      newValue: '',
      colorTag: item.colorTag || null,
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
      const matchAliases = (item.aliases || []).some((a) => a.toLowerCase().includes(q))
      const matchCat = item.category.toLowerCase().includes(q)
      const matchSummary = (item.summary || '').toLowerCase().includes(q)
      const matchContent = (item.content || '').toLowerCase().includes(q)
      const matchAttr = Object.entries(item.attributes || {}).some(
        ([k, v]) => k.toLowerCase().includes(q) || v.toLowerCase().includes(q)
      )
      return matchName || matchAliases || matchCat || matchSummary || matchContent || matchAttr
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

// Sincronizar apertura cuando se selecciona un Lore desde la paleta de comandos o desde la mención en el editor
watch(
  () => loreStore.activeLoreId,
  (newId) => {
    if (!newId) return
    const item = loreStore.items.find((i) => i.id === newId)
    if (item) {
      // Si la categoría estaba filtrada, resetear a 'todos' para que la tarjeta sea visible
      if (loreStore.selectedCategory !== 'todos' && loreStore.selectedCategory.toLowerCase() !== item.category.toLowerCase()) {
        loreStore.selectedCategory = 'todos'
      }
      expandedItemIds[newId] = true
      ensureDraft(item)
      nextTick(() => {
        setTimeout(() => {
          const el = document.getElementById(`lore-card-${newId}`)
          el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }, 60)
      })
    }
  },
  { immediate: true }
)

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
        aliases: targetDraft.aliases,
        attributes: attrsObj,
        colorTag: targetDraft.colorTag
      })

      targetDraft.saveStatus = 'saved'
    }, 600)
  }

  saveQueue[itemId]()
}

function handleAddAlias(item: LoreItem): void {
  const draft = ensureDraft(item)
  const raw = draft.newAlias.trim()
  if (!raw) return

  // Permitir agregar múltiples alias separados por comas, punto y coma o saltos de línea (ej. Dani, Daniiii, D)
  const parts = raw.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean)
  let changed = false
  for (const p of parts) {
    const isDuplicate = draft.aliases.some((a) => a.toLowerCase() === p.toLowerCase())
    const isMainName = draft.name.trim().toLowerCase() === p.toLowerCase()
    if (!isDuplicate && !isMainName) {
      draft.aliases.push(p)
      changed = true
    }
  }
  draft.newAlias = ''
  if (changed) {
    triggerCardSave(item.id)
  }
}

function handleRemoveAlias(item: LoreItem, index: number): void {
  const draft = ensureDraft(item)
  draft.aliases.splice(index, 1)
  triggerCardSave(item.id)
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
    aliases: [],
    summary: '',
    content: ''
  })

  if (created) {
    expandedItemIds[created.id] = true
    const draft = ensureDraft(created)
    draft.name = created.name
    draft.category = created.category
    draft.aliases = []
  }
}

async function handleDeleteLore(id: string): Promise<void> {
  await loreStore.moveToTrash(id)
  delete expandedItemIds[id]
  delete cardDrafts[id]
}

async function handleUpdateLoreColor(id: string, colorTag: string | null): Promise<void> {
  if (cardDrafts[id]) {
    cardDrafts[id].colorTag = colorTag
  }
  await loreStore.setLoreColor(id, colorTag)
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
        d.colorTag = item.colorTag || null
        d.aliases = Array.isArray(item.aliases) ? [...item.aliases] : []
        d.attributes = Object.entries(item.attributes || {}).map(([key, value]) => ({ key, value }))
      }
    }
  },
  { deep: true }
)
</script>

<template>
  <div class="h-full flex flex-col gap-2 min-w-0 select-none">
    <!-- Conmutador Segmentado: Wiki de Lore vs Reglas del Mundo (Ultra-delgado 32px) -->
    <div class="neu-well p-0.5 flex items-center gap-1 rounded-xl shrink-0 h-8">
      <button
        type="button"
        class="flex-1 h-full rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
        :class="uiStore.activeWikiTab === 'lore' ? 'neu-btn font-bold !text-[var(--accent)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'"
        @click="uiStore.setActiveWikiTab('lore')"
      >
        <Compass :size="12" />
        <span class="text-[11px] font-medium">Wiki</span>
        <span class="text-[9px] font-mono opacity-70">({{ loreStore.items.length }})</span>
      </button>

      <button
        type="button"
        class="flex-1 h-full rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
        :class="uiStore.activeWikiTab === 'rules' ? 'neu-btn font-bold !text-[var(--accent)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'"
        @click="uiStore.setActiveWikiTab('rules')"
      >
        <Scale :size="12" />
        <span class="text-[11px] font-medium">Reglas</span>
        <span class="text-[9px] font-mono opacity-70">({{ rulesStore.totalCount }})</span>
      </button>
    </div>

    <!-- VISTA 1: REGLAS DEL MUNDO (LEYES, AXIOMAS, CÓDIGOS) -->
    <template v-if="uiStore.activeWikiTab === 'rules'">
      <div class="flex-1 min-h-0 flex flex-col">
        <WorldRulesList />
      </div>
    </template>

    <!-- VISTA 2: ENTIDADES DE LORE (PERSONAJES, LUGARES, OBJETOS) -->
    <template v-else>
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

        <!-- Botón Nueva Entrada -->
        <button
          type="button"
          class="neu-btn-terracotta px-2.5 py-1.5 text-xs flex items-center gap-1.5 shrink-0 active:scale-95 transition-transform"
          title="Crear nueva ficha de personaje, lugar u objeto"
          @click="handleCreateLore"
        >
          <Plus :size="13" />
          <span class="font-medium text-[11px]">Nueva Ficha</span>
        </button>
      </div>

    <!-- Barra de Búsqueda Rápida en Vivo -->
    <div class="relative shrink-0">
      <div class="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-[var(--text-muted)]">
        <Search :size="12" />
      </div>
      <input
        v-model="searchQuery"
        type="text"
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
        :id="'lore-card-' + item.id"
        class="neu-surface overflow-hidden transition-all duration-200 border group"
        :draggable="!searchQuery.trim()"
        :class="[
          isExpanded(item.id)
            ? 'border-l-4 border-t-[var(--groove-light)] border-r-[var(--groove-light)] border-b-[var(--groove-light)] shadow-md'
            : 'border-[var(--groove-light)] hover:border-[var(--accent)]/40',
          isExpanded(item.id) && !item.colorTag ? 'border-l-[var(--accent)]' : '',
          dragOverLoreId === item.id ? 'ring-2 ring-[var(--accent)]/60 scale-[1.01]' : '',
          draggedLoreId === item.id ? 'opacity-50' : ''
        ]"
        :style="
          item.colorTag
            ? { borderLeftColor: `${item.colorTag} !important`, borderLeftWidth: '4px' }
            : {}
        "
        @dragstart="onDragStartLore($event, item.id)"
        @dragover="onDragOverLore($event, item.id)"
        @dragleave="onDragLeaveLore(item.id)"
        @drop="onDropLore($event, item.id)"
        @dragend="onDragEndLore"
      >
        <!-- CABECERA DEL ACORDEÓN (Siempre visible, clic para colapsar/desplegar) -->
        <div
          class="p-2.5 flex items-center justify-between gap-2 cursor-pointer select-none transition-colors"
          :class="isExpanded(item.id) ? 'bg-[var(--bg-surface)]' : 'hover:bg-[var(--bg-base)]/40'"
          @click="toggleExpand(item)"
        >
          <div class="flex items-center gap-1.5 min-w-0">
            <!-- Drag handle -->
            <GripVertical
              :size="12"
              class="text-[var(--text-muted)] opacity-40 group-hover:opacity-90 shrink-0 cursor-grab active:cursor-grabbing"
              title="Arrastrar para reordenar ficha"
              @click.stop
            />

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
                v-if="!isExpanded(item.id) && (item.summary || (item.aliases && item.aliases.length > 0))"
                class="text-[10px] text-[var(--text-muted)] truncate mt-0.5"
              >
                <span v-if="item.summary" class="italic">{{ item.summary }}</span>
                <span v-if="item.summary && item.aliases && item.aliases.length > 0" class="mx-1 opacity-50">·</span>
                <span v-if="item.aliases && item.aliases.length > 0" class="font-mono text-[9px] text-[var(--accent)]/90">
                  Alias: {{ item.aliases.join(', ') }}
                </span>
              </p>
            </div>
          </div>

          <!-- Acciones de cabecera -->
          <div class="flex items-center gap-1 shrink-0" @click.stop>
            <!-- Etiqueta de color / Categoría visual -->
            <div :class="item.colorTag ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 transition-opacity'">
              <ColorTagPicker
                :model-value="item.colorTag"
                align="right"
                size="sm"
                title="Etiqueta de color de la ficha"
                @update:model-value="(newColor) => handleUpdateLoreColor(item.id, newColor)"
              />
            </div>

            <span
              v-if="item.aliases && item.aliases.length > 0"
              class="text-[9px] font-mono px-1 py-0.5 rounded text-[var(--accent)] opacity-85 neu-well-sm"
              title="Alias configurados"
            >
              {{ item.aliases.length }} alias
            </span>

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

              <div class="flex items-center gap-1.5 flex-wrap">
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

                <!-- Selector de etiqueta de color en ficha expandida -->
                <ColorTagPicker
                  :model-value="cardDrafts[item.id].colorTag"
                  align="left"
                  size="sm"
                  title="Etiqueta de color"
                  @update:model-value="(c) => { cardDrafts[item.id].colorTag = c; triggerCardSave(item.id); }"
                />

                <input
                  v-model="cardDrafts[item.id].summary"
                  type="text"
                  placeholder="Resumen o rol breve..."
                  class="flex-1 min-w-[130px] text-[11px] italic text-[var(--text-secondary)] bg-transparent border-none focus:outline-none placeholder:text-[var(--text-muted)]/50"
                  @input="triggerCardSave(item.id)"
                />
              </div>
            </div>

            <!-- Sección de Alias y Nombres Alternativos (Activa autolink en el editor) -->
            <div class="neu-well p-2.5 space-y-2 rounded-lg">
              <div class="flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)]">
                <span class="flex items-center gap-1 font-semibold text-[var(--text-secondary)]">
                  <Sparkles :size="11" class="text-[var(--accent)]" />
                  <span>Alias & Nombres Alternativos</span>
                </span>
                <span>{{ cardDrafts[item.id].aliases.length }} alias</span>
              </div>

              <!-- Chips de alias existentes -->
              <div
                v-if="cardDrafts[item.id].aliases.length > 0"
                class="flex flex-wrap gap-1.5"
              >
                <div
                  v-for="(alias, aIdx) in cardDrafts[item.id].aliases"
                  :key="aIdx"
                  class="neu-well-sm px-2 py-0.5 text-[11px] flex items-center gap-1.5 group bg-[var(--bg-surface)] rounded-md border border-[var(--groove-dark)]/40"
                >
                  <span class="text-[var(--text-primary)] font-mono text-[11px] font-medium">{{ alias }}</span>
                  <button
                    type="button"
                    class="text-[var(--text-muted)] hover:text-rose-400 opacity-60 group-hover:opacity-100 transition-opacity ml-0.5 cursor-pointer"
                    title="Eliminar alias"
                    @click="handleRemoveAlias(item, aIdx)"
                  >
                    <X :size="10" />
                  </button>
                </div>
              </div>

              <!-- Input para agregar alias -->
              <div class="flex items-center gap-1.5 pt-0.5">
                <input
                  v-model="cardDrafts[item.id].newAlias"
                  type="text"
                  placeholder="Nuevo alias (ej. Dani, Daniiii, D) + Enter"
                  class="neu-well-sm px-2 py-1 text-[11px] bg-transparent border-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/50 focus:outline-none flex-1 min-w-0 font-mono"
                  @keydown.enter.prevent="handleAddAlias(item)"
                />
                <button
                  type="button"
                  class="neu-btn px-2 py-1 text-[10px] text-[var(--accent)] font-semibold flex items-center gap-0.5 shrink-0 cursor-pointer active:scale-95"
                  title="Añadir alias a esta ficha"
                  @click="handleAddAlias(item)"
                >
                  <Plus :size="10" />
                  <span>Añadir</span>
                </button>
              </div>
              <p class="text-[9px] text-[var(--text-muted)] font-mono leading-tight">
                Se detectará en el texto para previsualización al pasar el ratón y <strong class="text-[var(--accent)]">{{ modKey }}+Clic</strong>.
              </p>
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
    </template>

    <!-- Pie del Inspector con atajo de teclado visible -->
    <div class="neu-groove-h"></div>
    <div class="flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)] shrink-0">
      <span v-if="uiStore.activeWikiTab === 'lore'">{{ displayItems.length }} fichas</span>
      <span v-else>{{ rulesStore.filteredRules.length }} reglas</span>
      <span class="neu-well-sm px-1.5 py-0.5 text-[9px] text-[var(--accent)] font-semibold">{{ modKey }}+3: Ocultar Wiki</span>
    </div>
  </div>
</template>

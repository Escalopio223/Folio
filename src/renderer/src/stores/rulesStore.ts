import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { WorldRule, SaveWorldRuleInput } from '@shared/types'
import { useProjectStore } from './projectStore'

export const useRulesStore = defineStore('rules', () => {
  const projectStore = useProjectStore()

  const rules = ref<WorldRule[]>([])
  const selectedRuleId = ref<number | null>(null)
  const activeCategoryFilter = ref<string | null>(null)
  const searchQuery = ref<string>('')
  const isLoading = ref<boolean>(false)

  // Control del modal de creación / edición
  const isModalOpen = ref<boolean>(false)
  const editingRule = ref<WorldRule | null>(null)
  const prefilledCategory = ref<string | null>(null)

  // -------------------------------------------------------------------------
  // GETTERS
  // -------------------------------------------------------------------------

  /**
   * Lista reactiva de categorías únicas presentes en las reglas del proyecto actual.
   * Totalmente dinámica: no hardcodea opciones y se recalcula con cada cambio.
   */
  const categories = computed<string[]>(() => {
    const set = new Set<string>()
    for (const r of rules.value) {
      const cat = r.category?.trim()
      if (cat) set.add(cat)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))
  })

  /**
   * Reglas marcadas con chincheta (isPinned = true)
   */
  const pinnedRules = computed<WorldRule[]>(() => {
    return rules.value.filter((r) => r.isPinned)
  })

  /**
   * Reglas filtradas por búsqueda de texto y por categoría seleccionada
   */
  const filteredRules = computed<WorldRule[]>(() => {
    let list = rules.value

    // Filtro por categoría activa
    if (activeCategoryFilter.value !== null) {
      const targetCat = activeCategoryFilter.value.toLowerCase().trim()
      list = list.filter((r) => r.category.toLowerCase().trim() === targetCat)
    }

    // Filtro por término de búsqueda (título, axioma, limitaciones o detalles)
    const q = searchQuery.value.trim().toLowerCase()
    if (q) {
      list = list.filter((r) => {
        const matchTitle = (r.title || '').toLowerCase().includes(q)
        const matchAxiom = (r.axiom || '').toLowerCase().includes(q)
        const matchLimitations = (r.limitations || '').toLowerCase().includes(q)
        const matchDetails = (r.details || '').toLowerCase().includes(q)
        const matchCategory = (r.category || '').toLowerCase().includes(q)
        return matchTitle || matchAxiom || matchLimitations || matchDetails || matchCategory
      })
    }

    return list
  })

  /**
   * Reglas agrupadas por categoría
   */
  const rulesByCategory = computed<Record<string, WorldRule[]>>(() => {
    const map: Record<string, WorldRule[]> = {}
    for (const rule of filteredRules.value) {
      const cat = rule.category || 'General'
      if (!map[cat]) map[cat] = []
      map[cat].push(rule)
    }
    return map
  })

  const selectedRule = computed<WorldRule | null>(() => {
    if (!selectedRuleId.value) return null
    return rules.value.find((r) => r.id === selectedRuleId.value) || null
  })

  const totalCount = computed<number>(() => rules.value.length)

  // -------------------------------------------------------------------------
  // ACCIONES
  // -------------------------------------------------------------------------

  async function fetchRules(projectId?: string): Promise<void> {
    const targetProjectId = projectId || projectStore.activeProjectId
    if (!targetProjectId) {
      rules.value = []
      return
    }

    try {
      isLoading.value = true
      const data = await window.api.rules.list(targetProjectId)
      rules.value = data

      if (selectedRuleId.value && !data.some((r) => r.id === selectedRuleId.value)) {
        selectedRuleId.value = data[0]?.id || null
      }
    } catch (err) {
      console.error('[Rules Store] Error al obtener reglas del mundo:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function saveRule(input: SaveWorldRuleInput): Promise<WorldRule | null> {
    const targetProjectId = input.projectId || projectStore.activeProjectId
    if (!targetProjectId) {
      console.error('[Rules Store] No hay proyecto activo para guardar la regla')
      return null
    }

    try {
      isLoading.value = true
      const saved = await window.api.rules.save({
        ...input,
        projectId: targetProjectId
      })

      const index = rules.value.findIndex((r) => r.id === saved.id)
      if (index !== -1) {
        rules.value[index] = saved
      } else {
        // Nueva regla: si es pinned se añade arriba, si no, se inserta
        if (saved.isPinned) {
          rules.value.unshift(saved)
        } else {
          rules.value.push(saved)
        }
      }

      // Re-ordenar internamente manteniendo prioridad pinned -> categoría -> orden
      sortRulesLocally()
      selectedRuleId.value = saved.id
      return saved
    } catch (err) {
      console.error('[Rules Store] Error al guardar regla:', err)
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function deleteRule(id: number): Promise<boolean> {
    try {
      isLoading.value = true
      const success = await window.api.rules.delete(id)
      if (success) {
        rules.value = rules.value.filter((r) => r.id !== id)
        if (selectedRuleId.value === id) {
          selectedRuleId.value = rules.value[0]?.id || null
        }
      }
      return success
    } catch (err) {
      console.error('[Rules Store] Error al eliminar regla:', err)
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function togglePin(id: number): Promise<void> {
    const rule = rules.value.find((r) => r.id === id)
    if (!rule) return

    const newPinned = !rule.isPinned
    rule.isPinned = newPinned

    await saveRule({
      id: rule.id,
      projectId: rule.projectId,
      category: rule.category,
      title: rule.title,
      axiom: rule.axiom,
      details: rule.details,
      limitations: rule.limitations,
      isPinned: newPinned
    })
  }

  async function reorderRules(ids: number[]): Promise<boolean> {
    try {
      const ok = await window.api.rules.reorder(ids)
      if (ok) {
        const idMap = new Map(ids.map((id, index) => [id, index]))
        rules.value.sort((a, b) => {
          if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
          const orderA = idMap.has(a.id) ? idMap.get(a.id)! : a.orderIndex
          const orderB = idMap.has(b.id) ? idMap.get(b.id)! : b.orderIndex
          return orderA - orderB
        })
      }
      return ok
    } catch (err) {
      console.error('[Rules Store] Error al reordenar reglas:', err)
      return false
    }
  }

  function setCategoryFilter(category: string | null): void {
    activeCategoryFilter.value = category
  }

  function selectRule(id: number | null): void {
    selectedRuleId.value = id
  }

  function openCreateModal(initialCategory?: string): void {
    editingRule.value = null
    prefilledCategory.value = initialCategory || activeCategoryFilter.value || null
    isModalOpen.value = true
  }

  function openEditModal(rule: WorldRule): void {
    editingRule.value = { ...rule }
    prefilledCategory.value = null
    isModalOpen.value = true
  }

  function closeModal(): void {
    isModalOpen.value = false
    editingRule.value = null
    prefilledCategory.value = null
  }

  function sortRulesLocally(): void {
    rules.value.sort((a, b) => {
      // 1. Pinned primero
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
      // 2. Categoría alfabética
      const catCompare = a.category.localeCompare(b.category, 'es', { sensitivity: 'base' })
      if (catCompare !== 0) return catCompare
      // 3. OrderIndex
      if (a.orderIndex !== b.orderIndex) return a.orderIndex - b.orderIndex
      // 4. Última actualización
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })
  }

  return {
    rules,
    selectedRuleId,
    activeCategoryFilter,
    searchQuery,
    isLoading,
    isModalOpen,
    editingRule,
    prefilledCategory,

    // Getters
    categories,
    pinnedRules,
    filteredRules,
    rulesByCategory,
    selectedRule,
    totalCount,

    // Acciones
    fetchRules,
    saveRule,
    deleteRule,
    togglePin,
    reorderRules,
    setCategoryFilter,
    selectRule,
    openCreateModal,
    openEditModal,
    closeModal
  }
})

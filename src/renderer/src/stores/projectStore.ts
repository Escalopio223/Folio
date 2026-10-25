import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Project, CreateProjectInput, UpdateProjectInput } from '@shared/types'

const LAST_PROJECT_KEY = 'folio:lastActiveProject'

export const useProjectStore = defineStore('project', () => {
  const projects = ref<Project[]>([])
  const activeProjectId = ref<string | null>(localStorage.getItem(LAST_PROJECT_KEY))
  const isLoading = ref(false)

  const activeProject = computed<Project | null>(() => {
    if (!activeProjectId.value) return null
    return projects.value.find((p) => p.id === activeProjectId.value) || null
  })

  function selectProject(id: string): void {
    activeProjectId.value = id
    localStorage.setItem(LAST_PROJECT_KEY, id)
  }

  async function fetchProjects(): Promise<void> {
    try {
      isLoading.value = true
      const list = await window.api.project.getAll()
      projects.value = list

      const exists = list.some((p) => p.id === activeProjectId.value)
      if (!exists && list.length > 0) {
        selectProject(list[0].id)
      } else if (list.length === 0) {
        activeProjectId.value = null
        localStorage.removeItem(LAST_PROJECT_KEY)
      }
    } catch (err) {
      console.error('[Project Store] fetchProjects failed:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function createProject(input: CreateProjectInput): Promise<Project | null> {
    try {
      isLoading.value = true
      const created = await window.api.project.create(input)
      projects.value.unshift(created)
      selectProject(created.id)
      return created
    } catch (err) {
      console.error('[Project Store] createProject failed:', err)
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function updateProject(input: UpdateProjectInput): Promise<Project | null> {
    try {
      const updated = await window.api.project.update(input)
      const index = projects.value.findIndex((p) => p.id === updated.id)
      if (index !== -1) {
        projects.value[index] = updated
      }
      return updated
    } catch (err) {
      console.error('[Project Store] updateProject failed:', err)
      return null
    }
  }

  async function deleteProject(id: string): Promise<boolean> {
    try {
      const ok = await window.api.project.delete(id)
      if (ok) {
        projects.value = projects.value.filter((p) => p.id !== id)
        if (activeProjectId.value === id) {
          activeProjectId.value = projects.value[0]?.id || null
          if (activeProjectId.value) {
            localStorage.setItem(LAST_PROJECT_KEY, activeProjectId.value)
          } else {
            localStorage.removeItem(LAST_PROJECT_KEY)
          }
        }
      }
      return ok
    } catch (err) {
      console.error('[Project Store] deleteProject failed:', err)
      return false
    }
  }

  return {
    projects,
    activeProjectId,
    activeProject,
    isLoading,
    selectProject,
    fetchProjects,
    createProject,
    updateProject,
    deleteProject
  }
})

import type { Component } from 'vue'
import {
  FolderPlus,
  FilePlus,
  Sparkles,
  SunMoon,
  PanelLeft,
  PanelRight,
  AlignVerticalSpaceAround,
  Eye,
  Save,
  Trash2
} from 'lucide-vue-next'
import type { useUiStore } from '../../stores/uiStore'
import type { useFolioStore } from '../../stores/folioStore'
import type { useLoreStore } from '../../stores/loreStore'
import type { useProjectStore } from '../../stores/projectStore'
import { useTrashStore } from '../../stores/trashStore'

export interface CommandAction {
  id: string
  title: string
  description: string
  category: 'action'
  badge: string
  icon: Component
  shortcut?: string
  keywords?: string[]
  execute: () => void | Promise<void>
}

export interface StoreContext {
  uiStore: ReturnType<typeof useUiStore>
  folioStore: ReturnType<typeof useFolioStore>
  loreStore: ReturnType<typeof useLoreStore>
  projectStore: ReturnType<typeof useProjectStore>
  trashStore?: ReturnType<typeof useTrashStore>
}

/**
 * Registro centralizado y desacoplado de acciones ejecutables del sistema.
 * Permite añadir nuevos comandos fácilmente sin acoplar la vista modal.
 */
export function getSystemCommands(ctx: StoreContext): CommandAction[] {
  const { uiStore, folioStore, loreStore, projectStore } = ctx
  const trashStore = ctx.trashStore || useTrashStore()

  return [
    {
      id: 'new-chapter',
      title: 'Nuevo Capítulo',
      description: 'Crear un nuevo capítulo en el manuscrito actual',
      category: 'action',
      badge: 'Acción',
      icon: FolderPlus,
      keywords: ['capitulo', 'crear', 'seccion', 'manuscrito', 'nuevo'],
      execute: async () => {
        if (!projectStore.activeProjectId) return
        uiStore.setLeftSidebar(true)
        await folioStore.createChapter(projectStore.activeProjectId)
      }
    },
    {
      id: 'new-scene',
      title: 'Nueva Escena',
      description: 'Crear una escena en el capítulo activo o primer capítulo disponible',
      category: 'action',
      badge: 'Acción',
      icon: FilePlus,
      shortcut: 'Ctrl+Alt+N',
      keywords: ['escena', 'crear', 'folio', 'redaccion', 'nueva'],
      execute: async () => {
        if (!projectStore.activeProjectId) return
        uiStore.setLeftSidebar(true)

        let targetChapterId: string | null = null
        if (folioStore.activeFolio) {
          if (folioStore.activeFolio.parentId) {
            targetChapterId = folioStore.activeFolio.parentId
          } else {
            targetChapterId = folioStore.activeFolio.id
          }
        }

        if (!targetChapterId && folioStore.chapters.length > 0) {
          targetChapterId = folioStore.chapters[0].id
        }

        if (targetChapterId) {
          await folioStore.createScene(projectStore.activeProjectId, targetChapterId)
        } else {
          const chap = await folioStore.createChapter(projectStore.activeProjectId)
          if (chap) {
            await folioStore.createScene(projectStore.activeProjectId, chap.id)
          }
        }
      }
    },
    {
      id: 'new-lore',
      title: 'Nueva Ficha de Lore',
      description: 'Añadir un nuevo personaje, lugar u objeto a la Wiki',
      category: 'action',
      badge: 'Lore',
      icon: Sparkles,
      keywords: ['wiki', 'lore', 'personaje', 'lugar', 'objeto', 'ficha', 'crear'],
      execute: async () => {
        if (!projectStore.activeProjectId) return
        uiStore.setRightSidebar(true)
        await loreStore.createLore({
          projectId: projectStore.activeProjectId,
          category: 'personaje',
          name: 'Nueva Entrada Lore',
          summary: '',
          content: ''
        })
      }
    },
    {
      id: 'toggle-theme',
      title: 'Alternar Modo Oscuro (Espresso / Claro)',
      description: uiStore.isDark
        ? 'Cambiar al tema cálido Papel Claro'
        : 'Cambiar al tema inmersivo Espresso Oscuro',
      category: 'action',
      badge: 'Sistema',
      icon: SunMoon,
      keywords: ['tema', 'oscuro', 'claro', 'espresso', 'papel', 'color', 'dark', 'light'],
      execute: () => {
        uiStore.toggleTheme()
      }
    },
    {
      id: 'toggle-manuscript-sidebar',
      title: 'Alternar Árbol de Manuscrito (Sidebar Izq)',
      description: uiStore.isLeftSidebarOpen
        ? 'Ocultar panel lateral izquierdo de capítulos y escenas'
        : 'Mostrar panel lateral izquierdo de capítulos y escenas',
      category: 'action',
      badge: 'Vista',
      icon: PanelLeft,
      shortcut: 'Ctrl+B',
      keywords: ['sidebar', 'arbol', 'manuscrito', 'capitulos', 'izq', 'panel'],
      execute: () => {
        uiStore.toggleLeftSidebar()
      }
    },
    {
      id: 'toggle-wiki-inspector',
      title: 'Alternar Wiki Inspector (Sidebar Der)',
      description: uiStore.isRightSidebarOpen
        ? 'Ocultar panel lateral derecho de Lore & Wiki'
        : 'Mostrar panel lateral derecho de Lore & Wiki',
      category: 'action',
      badge: 'Vista',
      icon: PanelRight,
      shortcut: 'Ctrl+N',
      keywords: ['wiki', 'lore', 'inspector', 'der', 'panel', 'derecho'],
      execute: () => {
        uiStore.toggleRightSidebar()
      }
    },
    {
      id: 'toggle-typewriter',
      title: 'Alternar Modo Máquina de Escribir',
      description: uiStore.isTypewriterMode
        ? 'Desactivar scroll vertical fijo de línea activa'
        : 'Fijar la línea activa de escritura al 50vh de la pantalla',
      category: 'action',
      badge: 'Editor',
      icon: AlignVerticalSpaceAround,
      shortcut: 'Ctrl+Shift+T',
      keywords: ['typewriter', 'maquina', 'escribir', 'centrado', 'scroll', 'modo'],
      execute: () => {
        uiStore.toggleTypewriterMode()
      }
    },
    {
      id: 'toggle-focus-mode',
      title: 'Alternar Modo Enfoque',
      description: uiStore.isFocusMode
        ? 'Desactivar atenuación de párrafos secundarios'
        : 'Atenuar párrafos no activos para máxima concentración',
      category: 'action',
      badge: 'Editor',
      icon: Eye,
      shortcut: 'Ctrl+Shift+F',
      keywords: ['focus', 'enfoque', 'concentracion', 'parrafo', 'atenuar', 'modo'],
      execute: () => {
        uiStore.toggleFocusMode()
      }
    },
    {
      id: 'manual-save',
      title: 'Guardar Manuscrito',
      description: 'Forzar salvaguarda inmediata de cambios en la base de datos local',
      category: 'action',
      badge: 'Sistema',
      icon: Save,
      shortcut: 'Ctrl+S',
      keywords: ['guardar', 'salvar', 'sqlite', 'base de datos', 'save'],
      execute: async () => {
        await folioStore.saveCurrentFolio()
      }
    },
    {
      id: 'open-trash',
      title: 'Abrir Papelera de Reciclaje',
      description: 'Inspeccionar o recuperar escenas y fichas eliminadas, o vaciar residuos',
      category: 'action',
      badge: 'Sistema',
      icon: Trash2,
      keywords: ['papelera', 'basura', 'reciclaje', 'vaciar', 'eliminar', 'trash', 'residuos'],
      execute: () => {
        trashStore.openModal(projectStore.activeProjectId || undefined)
      }
    },
    {
      id: 'send-to-trash',
      title: 'Mover Escena Actual a la Papelera',
      description: 'Descartar la escena activa y enviarla a la papelera de reciclaje',
      category: 'action',
      badge: 'Manuscrito',
      icon: Trash2,
      keywords: ['descartar', 'papelera', 'escena', 'archivar', 'borrar', 'eliminar'],
      execute: async () => {
        if (folioStore.activeFolioId) {
          await trashStore.moveToTrash(folioStore.activeFolioId, 'folio')
        }
      }
    }
  ]
}

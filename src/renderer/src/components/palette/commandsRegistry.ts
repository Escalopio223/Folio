import type { Component } from 'vue'
import {
  FolderPlus,
  Sparkles,
  SunMoon,
  Palette,
  PanelLeft,
  PanelRight,
  Eye,
  Save,
  Trash2,
  Feather,
  Scale,
  RotateCcw,
  Target,
  Trophy,
  BookOpen,
  HelpCircle
} from 'lucide-vue-next'
import type { useUiStore } from '../../stores/uiStore'
import type { useFolioStore } from '../../stores/folioStore'
import type { useLoreStore } from '../../stores/loreStore'
import type { useProjectStore } from '../../stores/projectStore'
import { useTrashStore } from '../../stores/trashStore'
import { useScratchpadStore } from '../../stores/scratchpadStore'
import { useRulesStore } from '../../stores/rulesStore'
import { useGoalsStore } from '../../stores/goalsStore'

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
  scratchpadStore?: ReturnType<typeof useScratchpadStore>
  rulesStore?: ReturnType<typeof useRulesStore>
  goalsStore?: ReturnType<typeof useGoalsStore>
}

/**
 * Registro centralizado y desacoplado de acciones ejecutables del sistema.
 * Permite añadir nuevos comandos fácilmente sin acoplar la vista modal.
 */
export function getSystemCommands(ctx: StoreContext): CommandAction[] {
  const { uiStore, folioStore, loreStore, projectStore } = ctx
  const trashStore = ctx.trashStore || useTrashStore()
  const scratchpadStore = ctx.scratchpadStore || useScratchpadStore()
  const rulesStore = ctx.rulesStore || useRulesStore()
  const goalsStore = ctx.goalsStore || useGoalsStore()

  return [
    {
      id: 'new-chapter',
      title: 'Nuevo Capítulo',
      description: 'Crear un nuevo capítulo en el manuscrito actual',
      category: 'action',
      badge: 'Acción',
      icon: FolderPlus,
      shortcut: 'Ctrl+Alt+N',
      keywords: ['capitulo', 'crear', 'seccion', 'manuscrito', 'nuevo', 'folio'],
      execute: async () => {
        if (!projectStore.activeProjectId) return
        uiStore.setLeftSidebar(true)
        await folioStore.createChapter(projectStore.activeProjectId)
      }
    },
    {
      id: 'new-frontmatter',
      title: 'Nuevo Preliminar (Prólogo / Dedicatoria)',
      description: 'Añadir una página preliminar al inicio de la obra',
      category: 'action',
      badge: 'Acción',
      icon: BookOpen,
      keywords: ['preliminar', 'prologo', 'dedicatoria', 'frontmatter', 'prefacio'],
      execute: async () => {
        if (!projectStore.activeProjectId) return
        uiStore.setLeftSidebar(true)
        await folioStore.createChapter(projectStore.activeProjectId, {
          type: 'frontmatter',
          title: 'Prólogo'
        })
      }
    },
    {
      id: 'new-backmatter',
      title: 'Nuevo Anexo / Epílogo',
      description: 'Añadir un epílogo, glosario o apéndice al cierre del libro',
      category: 'action',
      badge: 'Acción',
      icon: BookOpen,
      keywords: ['anexo', 'epilogo', 'apendice', 'backmatter', 'glosario'],
      execute: async () => {
        if (!projectStore.activeProjectId) return
        uiStore.setLeftSidebar(true)
        await folioStore.createChapter(projectStore.activeProjectId, {
          type: 'backmatter',
          title: 'Epílogo'
        })
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
      id: 'open-theme-customizer',
      title: 'Personalizar Sistema de 3 Colores (Botones, Texto y Background)',
      description:
        'Configurar el color de Botones, Texto, Background y el filtro de gamas de gamificación',
      category: 'action',
      badge: 'Sistema',
      icon: Palette,
      keywords: [
        'color',
        'colores',
        'tema',
        'botones',
        'texto',
        'background',
        'fondo',
        'gamas',
        'filtro',
        'claro',
        'oscuro'
      ],
      execute: () => {
        uiStore.openThemeModal()
      }
    },
    {
      id: 'toggle-theme',
      title: 'Alternar Tema Claro por Defecto / Estudio Nocturno',
      description: uiStore.isDark
        ? 'Restablecer al Modo Claro por defecto (Papel Cálido)'
        : 'Cambiar rápidamente al preset Estudio Nocturno',
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
      title: 'Alternar Panel de Manuscrito (Sidebar Izq)',
      description: uiStore.isLeftSidebarOpen
        ? 'Ocultar panel lateral izquierdo de capítulos'
        : 'Mostrar panel lateral izquierdo de capítulos',
      category: 'action',
      badge: 'Vista',
      icon: PanelLeft,
      shortcut: 'Ctrl+1',
      keywords: ['sidebar', 'arbol', 'manuscrito', 'capitulos', 'izq', 'panel'],
      execute: () => {
        uiStore.toggleLeftSidebar()
      }
    },
    {
      id: 'focus-editor-canvas',
      title: 'Enfocar Lienzo Central (Editor)',
      description: 'Devolver el foco del cursor directamente a la prosa del capítulo activo',
      category: 'action',
      badge: 'Vista',
      icon: Feather,
      shortcut: 'Ctrl+2',
      keywords: ['editor', 'lienzo', 'foco', 'prosa', 'escribir', 'central'],
      execute: () => {
        const editorEl = document.querySelector('.ProseMirror') as HTMLElement | null
        editorEl?.focus()
      }
    },
    {
      id: 'toggle-wiki-inspector',
      title: 'Alternar Wiki / Reglas (Sidebar Der)',
      description: uiStore.isRightSidebarOpen
        ? 'Ocultar panel lateral derecho de Lore & Wiki'
        : 'Mostrar panel lateral derecho de Lore & Wiki',
      category: 'action',
      badge: 'Vista',
      icon: PanelRight,
      shortcut: 'Ctrl+3',
      keywords: ['wiki', 'lore', 'inspector', 'der', 'panel', 'derecho', 'reglas'],
      execute: () => {
        uiStore.toggleRightSidebar()
      }
    },
    {
      id: 'reset-sidebar-sizes',
      title: 'Restablecer Tamaño de Paneles (Manuscrito y Wiki)',
      description: 'Restablece el ancho predeterminado de los paneles de manuscrito y wiki',
      category: 'action',
      badge: 'Vista',
      icon: RotateCcw,
      keywords: [
        'tamaño',
        'paneles',
        'ancho',
        'sidebar',
        'manuscrito',
        'wiki',
        'restablecer',
        'redimensionar',
        'defecto',
        'arrastrar'
      ],
      execute: () => {
        uiStore.resetSidebarWidths()
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
      id: 'open-session-goal-ritual',
      title: 'Fijar Meta de Sesión («Ritual de Inicio»)',
      description: 'Definir un objetivo rápido para esta sesión de escritura o activar modo libre',
      category: 'action',
      badge: 'Objetivos',
      icon: Sparkles,
      keywords: [
        'ritual',
        'sesion',
        'meta',
        'objetivo',
        'inicio',
        'palabras',
        'pluma ligera',
        'libre'
      ],
      execute: () => {
        goalsStore.openSessionPrompt()
      }
    },
    {
      id: 'view-goals-and-achievements',
      title: 'Ver Metas de Escritura y Logros',
      description: 'Abrir el panel de expectativas del libro, ritmo diario y vitrina de insignias',
      category: 'action',
      badge: 'Objetivos',
      icon: Trophy,
      keywords: [
        'metas',
        'logros',
        'objetivo',
        'expectativas',
        'insignias',
        'racha',
        'palabras',
        'gamificacion'
      ],
      execute: () => {
        goalsStore.openGoalsModal('expectations')
      }
    },
    {
      id: 'view-achievements-showcase',
      title: 'Abrir Vitrina de Logros Editoriales',
      description: 'Consultar los hitos conseguidos y el progreso de tus logros literarios',
      category: 'action',
      badge: 'Objetivos',
      icon: Trophy,
      keywords: ['vitrina', 'logros', 'hitos', 'trofeos', 'insignias', 'medallas'],
      execute: () => {
        goalsStore.openGoalsModal('achievements')
      }
    },
    {
      id: 'config-daily-words',
      title: 'Configurar Objetivo Diario de Palabras',
      description: 'Definir o ajustar tu meta de palabras y capítulos por jornada',
      category: 'action',
      badge: 'Objetivos',
      icon: Target,
      keywords: ['meta', 'diaria', 'palabras', 'configurar', 'objetivo', 'ritmo', 'expectativa'],
      execute: () => {
        goalsStore.openGoalsModal('expectations')
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
      description: 'Inspeccionar o recuperar capítulos y fichas eliminadas, o vaciar residuos',
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
      title: 'Mover Capítulo Actual a la Papelera',
      description: 'Descartar el capítulo activo y enviarlo a la papelera de reciclaje',
      category: 'action',
      badge: 'Manuscrito',
      icon: Trash2,
      keywords: ['descartar', 'papelera', 'capitulo', 'archivar', 'borrar', 'eliminar'],
      execute: async () => {
        if (folioStore.activeFolioId) {
          await trashStore.moveToTrash(folioStore.activeFolioId, 'folio')
        }
      }
    },
    {
      id: 'toggle-scratchpad',
      title: 'Abrir Scratchpad / Bloc Rápido',
      description: 'Abrir o cerrar el bloc de captura rápida de ideas',
      category: 'action',
      badge: 'Herramienta',
      icon: Feather,
      shortcut: 'Ctrl+J',
      keywords: [
        'scratchpad',
        'bloc',
        'rapido',
        'ideas',
        'notas',
        'anotaciones',
        'apunte',
        'borrador'
      ],
      execute: () => {
        scratchpadStore.toggleScratchpad()
      }
    },
    {
      id: 'new-scratchpad-note',
      title: 'Nueva Nota en Scratchpad',
      description: 'Crear una nueva anotación rápida en blanco en el bloc',
      category: 'action',
      badge: 'Herramienta',
      icon: Feather,
      keywords: ['scratchpad', 'nueva nota', 'apunte', 'idea'],
      execute: async () => {
        await scratchpadStore.openScratchpad()
        await scratchpadStore.createQuickNote()
      }
    },
    {
      id: 'new-world-rule',
      title: 'Nueva Regla del Mundo',
      description: 'Crear una ley dura, axioma, código o limitación en el universo narrativo',
      category: 'action',
      badge: 'Reglas',
      icon: Scale,
      keywords: [
        'regla',
        'ley',
        'mundo',
        'axioma',
        'codigo',
        'limite',
        'sistema',
        'magia',
        'tecnologia',
        'nueva',
        'norma'
      ],
      execute: () => {
        uiStore.openWikiRules()
        rulesStore.openCreateModal()
      }
    },
    {
      id: 'open-help-guide',
      title: 'Guía y Manual de Usuario',
      description: 'Consultar atajos de teclado y la guía completa de funcionalidades de Folio',
      category: 'action',
      badge: 'Ayuda',
      icon: HelpCircle,
      shortcut: 'F1',
      keywords: ['ayuda', 'manual', 'guia', 'atajos', 'tutorial', 'documentacion', 'shortcuts', 'teclas'],
      execute: () => {
        uiStore.openHelpModal()
      }
    },
    {
      id: 'view-world-rules',
      title: 'Ver Reglas del Mundo',
      description:
        'Consultar las leyes, códigos y sistemas del universo narrativo en el panel lateral',
      category: 'action',
      badge: 'Vista',
      icon: Scale,
      keywords: [
        'reglas',
        'leyes',
        'mundo',
        'axiomas',
        'codigos',
        'sistemas',
        'normas',
        'ver',
        'consultar'
      ],
      execute: () => {
        uiStore.openWikiRules()
      }
    }
  ]
}

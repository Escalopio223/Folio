<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  X,
  Keyboard,
  BookOpen,
  Feather,
  Sparkles,
  Search,
  FolderTree,
  Trophy,
  ShieldCheck,
  HelpCircle,
  Pin
} from 'lucide-vue-next'
import { onClickOutside } from '@vueuse/core'
import { useUiStore } from '../stores/uiStore'
import { modKey, formatShortcut } from '../utils/platform'

const uiStore = useUiStore()

const modalCardRef = ref<HTMLElement | null>(null)
const activeTab = ref<'shortcuts' | 'features'>('shortcuts')
const shortcutSearchQuery = ref('')

onClickOutside(modalCardRef, () => {
  uiStore.closeHelpModal()
})

function handleKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape' && uiStore.isHelpModalOpen) {
    e.preventDefault()
    uiStore.closeHelpModal()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

interface ShortcutCategory {
  title: string
  items: {
    keys: string[]
    description: string
    context: string
  }[]
}

const shortcutCategories = computed<ShortcutCategory[]>(() => [
  {
    title: '1. Navegación y Vistas Tripartitas',
    items: [
      {
        keys: [modKey, '1'],
        description: 'Alternar panel izquierdo (Árbol del Manuscrito)',
        context: 'Global'
      },
      {
        keys: [modKey, '3'],
        description: 'Alternar panel derecho (Wiki de Lore y Reglas del Mundo)',
        context: 'Global'
      },
      {
        keys: [modKey, 'J'],
        description: 'Abrir o cerrar el Scratchpad (cajón de captura rápida)',
        context: 'Global'
      },
      {
        keys: [modKey, 'K'],
        description: 'Paleta de Comandos y Búsqueda Profunda en todo el libro',
        context: 'Global'
      },
      {
        keys: ['F1'],
        description: 'Abrir este Manual y Guía de Atajos',
        context: 'Global'
      }
    ]
  },
  {
    title: '2. Modos de Inmersión y Concentración',
    items: [
      {
        keys: [modKey, 'Shift', 'F'],
        description: 'Alternar Modo Zen (Pantalla completa, sin distracciones y enfoque de párrafo)',
        context: 'Editor'
      },
      {
        keys: ['F11'],
        description: 'Alternar Modo Zen / Pantalla completa nativa',
        context: 'Global'
      },
      {
        keys: [modKey, 'Shift', 'T'],
        description: 'Modo Máquina de Escribir (Línea de redacción anclada al centro de la pantalla)',
        context: 'Editor'
      },
      {
        keys: ['Esc'],
        description: 'Salir del Modo Zen / Cerrar modal o panel activo',
        context: 'Global'
      }
    ]
  },
  {
    title: '3. Gestión del Manuscrito y Archivo',
    items: [
      {
        keys: [modKey, 'S'],
        description: 'Guardado forzado instantáneo a la base de datos SQLite',
        context: 'Editor'
      },
      {
        keys: [modKey, 'Alt', 'N'],
        description: 'Crear un nuevo capítulo instantáneamente sin tocar el ratón',
        context: 'Manuscrito'
      },
      {
        keys: [modKey, 'Clic'],
        description: 'Saltar a la ficha de la Wiki desde un personaje o entidad detectada en el texto',
        context: 'Editor'
      }
    ]
  },
  {
    title: '4. Búsqueda dentro del Capítulo Activo',
    items: [
      {
        keys: [modKey, 'F'],
        description: 'Abrir barra flotante de búsqueda de texto dentro del capítulo',
        context: 'Editor'
      },
      {
        keys: ['Enter'],
        description: 'Saltar a la siguiente coincidencia encontrada',
        context: 'Búsqueda'
      },
      {
        keys: ['Shift', 'Enter'],
        description: 'Retroceder a la coincidencia anterior',
        context: 'Búsqueda'
      },
      {
        keys: ['Esc'],
        description: 'Cerrar la barra de búsqueda y volver al texto',
        context: 'Búsqueda'
      }
    ]
  },
  {
    title: '5. Scratchpad (Captura Rápida de Ideas)',
    items: [
      {
        keys: ['Enter'],
        description: 'Fijar nota al feed continuo al instante (cero fricción)',
        context: 'Scratchpad'
      },
      {
        keys: ['Shift', 'Enter'],
        description: 'Salto de línea dentro de la nota sin guardarla',
        context: 'Scratchpad'
      },
      {
        keys: [modKey, 'Enter'],
        description: 'Fijar nota de inmediato (atajo alternativo)',
        context: 'Scratchpad'
      },
      {
        keys: ['Esc'],
        description: 'Cerrar el Scratchpad y devolver el foco al editor',
        context: 'Scratchpad'
      }
    ]
  },
  {
    title: `6. Paleta de Comandos (${modKey}+K)`,
    items: [
      {
        keys: ['↑', '↓'],
        description: 'Navegar entre resultados, capítulos y acciones del sistema',
        context: 'Paleta'
      },
      {
        keys: ['Enter'],
        description: 'Ejecutar comando o abrir la escena/ficha seleccionada',
        context: 'Paleta'
      },
      {
        keys: ['Esc'],
        description: 'Cerrar la paleta de comandos',
        context: 'Paleta'
      }
    ]
  },
  {
    title: '7. Formato Tipográfico y Edición',
    items: [
      {
        keys: [modKey, 'B'],
        description: 'Aplicar o quitar formato Negrita',
        context: 'Editor'
      },
      {
        keys: [modKey, 'I'],
        description: 'Aplicar o quitar formato Cursiva (itálica)',
        context: 'Editor'
      },
      {
        keys: [modKey, 'U'],
        description: 'Aplicar o quitar Subrayado',
        context: 'Editor'
      },
      {
        keys: [modKey, 'Shift', 'X'],
        description: 'Aplicar o quitar Tachado',
        context: 'Editor'
      },
      {
        keys: [modKey, 'Alt', '1 / 2 / 3'],
        description: 'Convertir párrafo en Encabezado H1, H2 o H3',
        context: 'Editor'
      },
      {
        keys: [modKey, 'Alt', '0'],
        description: 'Restablecer a Párrafo normal',
        context: 'Editor'
      },
      {
        keys: [modKey, 'Shift', 'B'],
        description: 'Convertir bloque en Cita editorial (Blockquote)',
        context: 'Editor'
      },
      {
        keys: [modKey, 'Shift', 'S'],
        description: 'Insertar descanso de escena tipográfico (* * *)',
        context: 'Editor'
      },
      {
        keys: ['Tab'],
        description: 'Insertar 2 espacios de sangría editorial limpia',
        context: 'Editor'
      },
      {
        keys: ['Shift', 'Tab'],
        description: 'Reducir sangría del párrafo (Outdent)',
        context: 'Editor'
      },
      {
        keys: [modKey, 'Z'],
        description: 'Deshacer último cambio de texto',
        context: 'Editor'
      },
      {
        keys: [modKey, 'Y'],
        description: 'Rehacer último cambio deshecho',
        context: 'Editor'
      }
    ]
  },
  {
    title: '8. Atajos Markdown en Tiempo Real al Escribir',
    items: [
      {
        keys: ['#', 'Espacio'],
        description: 'Convierte la línea en Encabezado 1 (H1)',
        context: 'Markdown'
      },
      {
        keys: ['##', 'Espacio'],
        description: 'Convierte la línea en Encabezado 2 (H2)',
        context: 'Markdown'
      },
      {
        keys: ['###', 'Espacio'],
        description: 'Convierte la línea en Encabezado 3 (H3)',
        context: 'Markdown'
      },
      {
        keys: ['>', 'Espacio'],
        description: 'Inicia un bloque de Cita editorial',
        context: 'Markdown'
      },
      {
        keys: ['-', 'Espacio'],
        description: 'Inicia una lista con viñetas',
        context: 'Markdown'
      },
      {
        keys: ['1.', 'Espacio'],
        description: 'Inicia una lista numerada',
        context: 'Markdown'
      },
      {
        keys: ['***', 'Enter'],
        description: 'Inserta un separador de descanso de escena',
        context: 'Markdown'
      }
    ]
  }
])

const filteredCategories = computed(() => {
  const query = shortcutSearchQuery.value.trim().toLowerCase()
  if (!query) return shortcutCategories.value

  return shortcutCategories.value
    .map((cat) => ({
      title: cat.title,
      items: cat.items.filter(
        (item) =>
          item.description.toLowerCase().includes(query) ||
          item.keys.join(' ').toLowerCase().includes(query) ||
          item.context.toLowerCase().includes(query)
      )
    }))
    .filter((cat) => cat.items.length > 0)
})

interface FeatureModule {
  title: string
  subtitle: string
  icon: any
  shortcut?: string
  bullets: string[]
}

const featureModules = computed<FeatureModule[]>(() => [
  {
    title: '1. Árbol del Manuscrito',
    subtitle: 'Estructura organizada de tu obra literaria',
    icon: FolderTree,
    shortcut: formatShortcut('Ctrl+1'),
    bullets: [
      'Organiza tu libro en capítulos, preliminares (prólogos, dedicatorias) y epílogos.',
      'Reordena capítulos y escenas cómodamente arrastrando y soltando (Drag & Drop).',
      'Edita títulos en línea con un simple clic y controla el estado editorial (Borrador, En curso, Finalizado).',
      'Etiquetas de color configurables a mano para distinguir visualmente tramas, tonos y capítulos a simple vista.',
      'Inserta descansos de escena (* * *) para dividir y navegar ágilmente por sub-escenas.'
    ]
  },
  {
    title: '2. Lienzo Central & Modo Zen',
    subtitle: 'El santuario de escritura inmersiva libre de distracciones',
    icon: Feather,
    shortcut: formatShortcut('Ctrl+Shift+F'),
    bullets: [
      `Modo Zen (${modKey}+Shift+F o F11): oculta todas las barras y menús, dejando un lienzo puro con iluminación focalizada en el párrafo en el que estás redactando.`,
      `Modo Máquina de Escribir (${modKey}+Shift+T): fija la línea activa al 50% vertical de la pantalla para no bajar la mirada ni fatigarte.`,
      'Sonido Mecánico Opcional: chasquido sutil de teclas, campanilla de final de línea y retorno de carro mecánico.',
      `Buscador integrado (${modKey}+F) estilo VS Code para saltar y reemplazar texto en la escena activa.`
    ]
  },
  {
    title: '3. Scratchpad (Bloc Rápido)',
    subtitle: 'Captura instantánea de ideas fugaces con cero fricción',
    icon: Pin,
    shortcut: formatShortcut('Ctrl+J'),
    bullets: [
      `Ábrelo al instante desde cualquier parte con ${modKey}+J; el cursor ya estará listo para teclear.`,
      'Sin formularios obligatorios: escribe lo que se te ocurra y pulsa Enter para fijar la idea en el feed continuo.',
      'Fija notas importantes arriba con el botón de chincheta y cópialas al portapapeles con un solo clic.',
      'Persistencia inmediata en SQLite local: tus pensamientos quedan guardados en milisegundos.'
    ]
  },
  {
    title: '4. Wiki de Lore & Reglas del Mundo',
    subtitle: 'Tu biblia narrativa conectada bidireccionalmente al manuscrito',
    icon: Sparkles,
    shortcut: formatShortcut('Ctrl+3'),
    bullets: [
      'Crea fichas ordenadas para Personajes, Lugares, Objetos y Facciones de tu universo.',
      'Etiquetas de color personalizables a mano para categorizar visualmente y reconocer de inmediato cada entrada.',
      'Detección automática en el editor: Folio reconoce los nombres de tus personajes mientras redactas y los subraya sutilmente sin ensuciar el texto.',
      `Hover Preview & ${modKey}+Clic: reposa el ratón sobre cualquier mención para ver su resumen, o pulsa ${modKey}+Clic para saltar directamente a su ficha en la Wiki.`,
      'Reglas del Mundo: documenta axiomas, leyes mágicas y códigos inquebrantables de tu universo narrativo.'
    ]
  },
  {
    title: '5. Paleta de Comandos & Búsqueda Profunda',
    subtitle: 'El Omnibox universal que controla toda la aplicación',
    icon: Search,
    shortcut: formatShortcut('Ctrl+K'),
    bullets: [
      `Pulsa ${modKey}+K para abrir la paleta global y navegar por toda la aplicación desde el teclado.`,
      'Búsqueda profunda: encuentra al instante cualquier frase o fragmento a través de todos los capítulos del manuscrito simultáneamente.',
      'Ejecuta cualquier acción de la app (cambiar temas, guardar, crear escenas, abrir papelera) en segundos.'
    ]
  },
  {
    title: '6. Ritmo Diario, Metas & Logros',
    subtitle: 'Motivación y seguimiento constante de tu progreso como autor',
    icon: Trophy,
    bullets: [
      'Fija tu expectativa diaria o define un objetivo de palabras por sesión antes de empezar a escribir.',
      'Seguimiento de racha diaria de escritura y conteo de palabras en tiempo real en la barra de estado inferior.',
      'Vitrina con 22 logros editoriales inspiradores que recompensan tu constancia literaria.'
    ]
  },
  {
    title: '7. Seguridad Local-First & Papelera',
    subtitle: 'Control absoluto y privacidad total de tu obra',
    icon: ShieldCheck,
    shortcut: formatShortcut('Ctrl+S'),
    bullets: [
      'Almacenamiento local en SQLite: tu manuscrito vive exclusivamente en tu ordenador y nunca se sube a servidores externos.',
      'Autoguardado continuo inteligente con debounce para garantizar cero pérdida de datos.',
      'Papelera de reciclaje segura: ningún capítulo o ficha eliminada se borra de inmediato; puedes restaurarlos cuando quieras.'
    ]
  }
])
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="uiStore.isHelpModalOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/60 backdrop-blur-sm select-none"
      >
        <!-- Modal Card -->
        <div
          ref="modalCardRef"
          class="neu-panel w-full max-w-4xl max-h-[88vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-[var(--neu-border)] bg-[var(--bg-base)] text-[var(--text-primary)] animate-in fade-in zoom-in-95 duration-150"
        >
          <!-- Header -->
          <div
            class="px-6 py-4 flex items-center justify-between border-b border-[var(--neu-border)] bg-[var(--bg-surface)] shrink-0"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-9 h-9 rounded-xl neu-well flex items-center justify-center text-[var(--accent)]"
              >
                <HelpCircle :size="20" />
              </div>
              <div>
                <h2 class="font-editorial text-lg md:text-xl font-bold text-[var(--text-primary)]">
                  Guía y Manual de Folio
                </h2>
                <p class="text-[11px] text-[var(--text-muted)] font-mono">
                  Atajos rápidos de teclado y funcionalidades principales explicadas de forma simple
                </p>
              </div>
            </div>

            <button
              type="button"
              class="neu-btn w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
              title="Cerrar guía (Esc)"
              @click="uiStore.closeHelpModal"
            >
              <X :size="16" />
            </button>
          </div>

          <!-- Navigation Tabs Simples: 2 Apartados Claros -->
          <div
            class="px-6 pt-3 pb-2 flex items-center gap-2 border-b border-[var(--neu-border)] bg-[var(--bg-base)] shrink-0"
          >
            <button
              type="button"
              class="neu-btn px-4 py-1.5 rounded-lg flex items-center gap-2 text-xs font-medium cursor-pointer transition-all"
              :class="{
                'neu-well !text-[var(--accent)] font-semibold shadow-inner':
                  activeTab === 'shortcuts'
              }"
              @click="activeTab = 'shortcuts'"
            >
              <Keyboard :size="14" />
              <span>Atajos de Teclado</span>
            </button>

            <button
              type="button"
              class="neu-btn px-4 py-1.5 rounded-lg flex items-center gap-2 text-xs font-medium cursor-pointer transition-all"
              :class="{
                'neu-well !text-[var(--accent)] font-semibold shadow-inner':
                  activeTab === 'features'
              }"
              @click="activeTab = 'features'"
            >
              <BookOpen :size="14" />
              <span>Funcionalidades de Folio</span>
            </button>
          </div>

          <!-- Body Content -->
          <div class="flex-1 overflow-y-auto p-6 space-y-6 text-sm editorial-scrollbar">
            <!-- =============================================================== -->
            <!-- APARTADO 1: ATAJOS DE TECLADO                                    -->
            <!-- =============================================================== -->
            <div v-if="activeTab === 'shortcuts'" class="space-y-6">
              <!-- Search Shortcuts Input -->
              <div class="relative">
                <Search
                  :size="15"
                  class="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
                />
                <input
                  v-model="shortcutSearchQuery"
                  type="text"
                  placeholder="Buscar atajo por combinación, tecla o acción..."
                  class="w-full neu-input pl-10 pr-4 py-2 text-xs rounded-xl focus:outline-none placeholder:text-[var(--text-muted)] font-mono"
                />
              </div>

              <div
                v-if="filteredCategories.length === 0"
                class="text-center py-10 text-[var(--text-muted)]"
              >
                <Keyboard :size="32" class="mx-auto mb-2 opacity-40" />
                <p>No se encontraron atajos que coincidan con "{{ shortcutSearchQuery }}".</p>
              </div>

              <!-- List of Categories -->
              <div
                v-for="cat in filteredCategories"
                :key="cat.title"
                class="neu-panel p-4 rounded-xl border border-[var(--neu-border)] space-y-3"
              >
                <div class="flex items-center justify-between border-b border-[var(--neu-border)] pb-2">
                  <h3 class="font-editorial text-sm font-bold text-[var(--accent)]">
                    {{ cat.title }}
                  </h3>
                  <span class="text-[10px] font-mono text-[var(--text-muted)]">
                    {{ cat.items.length }} atajos
                  </span>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  <div
                    v-for="item in cat.items"
                    :key="item.description"
                    class="neu-surface p-2.5 rounded-lg flex items-center justify-between gap-3 text-xs"
                  >
                    <div class="min-w-0 pr-2">
                      <p class="font-medium text-[var(--text-primary)] leading-snug">
                        {{ item.description }}
                      </p>
                      <span class="text-[10px] font-mono text-[var(--text-muted)] opacity-80">
                        {{ item.context }}
                      </span>
                    </div>

                    <!-- Key combination pills -->
                    <div class="flex items-center gap-1 shrink-0">
                      <kbd
                        v-for="k in item.keys"
                        :key="k"
                        class="neu-well-sm px-2 py-0.5 text-[11px] font-mono font-semibold text-[var(--accent)] rounded shadow-sm"
                      >
                        {{ k }}
                      </kbd>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- =============================================================== -->
            <!-- APARTADO 2: FUNCIONALIDADES DE FOLIO (SIMPLE Y EN 1 LECTURA)    -->
            <!-- =============================================================== -->
            <div v-else-if="activeTab === 'features'" class="space-y-4">
              <div class="neu-panel p-4 rounded-xl border border-[var(--neu-border)] bg-[var(--bg-surface)]">
                <p class="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Folio está diseñado como un <strong>santuario editorial local</strong> para escritores de novelas y narrativa. Aquí tienes el resumen directo de cada pilar de la aplicación para dominarla en una sola lectura:
                </p>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div
                  v-for="feat in featureModules"
                  :key="feat.title"
                  class="neu-surface p-4 rounded-xl border border-[var(--neu-border)] space-y-2.5 flex flex-col justify-between"
                >
                  <div class="space-y-2">
                    <div class="flex items-center justify-between gap-2 border-b border-[var(--neu-border)] pb-2">
                      <div class="flex items-center gap-2">
                        <component :is="feat.icon" :size="16" class="text-[var(--accent)] shrink-0" />
                        <h4 class="font-editorial text-sm font-bold text-[var(--text-primary)]">
                          {{ feat.title }}
                        </h4>
                      </div>
                      <kbd
                        v-if="feat.shortcut"
                        class="neu-well-sm px-1.5 py-0.5 text-[10px] font-mono font-semibold text-[var(--accent)] rounded"
                      >
                        {{ feat.shortcut }}
                      </kbd>
                    </div>

                    <p class="text-[11px] text-[var(--text-muted)] font-mono leading-tight">
                      {{ feat.subtitle }}
                    </p>

                    <ul class="text-xs text-[var(--text-secondary)] space-y-1.5 list-disc list-inside leading-relaxed pt-1">
                      <li v-for="(bullet, bIdx) in feat.bullets" :key="bIdx">
                        {{ bullet }}
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div
            class="px-6 py-3 border-t border-[var(--neu-border)] bg-[var(--bg-surface)] flex items-center justify-between text-xs text-[var(--text-muted)] shrink-0"
          >
            <div class="flex items-center gap-3">
              <span class="font-mono text-[11px]">Folio v1.2.3</span>
              <span>·</span>
              <span>
                Pulsa
                <kbd class="neu-well-sm px-1.5 py-0.5 text-[10px] font-mono text-[var(--accent)] font-semibold">F1</kbd>
                para abrir esta guía en cualquier momento
              </span>
            </div>

            <button
              type="button"
              class="neu-btn px-4 py-1.5 rounded-lg text-xs font-semibold text-[var(--text-primary)] hover:!text-[var(--accent)] cursor-pointer transition-all active:scale-95"
              @click="uiStore.closeHelpModal"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.editorial-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.editorial-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.editorial-scrollbar::-webkit-scrollbar-thumb {
  background: var(--groove-dark);
  border-radius: 9999px;
  opacity: 0.5;
}
.editorial-scrollbar::-webkit-scrollbar-thumb:hover {
  background: var(--accent);
}
</style>

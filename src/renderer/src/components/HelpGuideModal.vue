<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  X,
  Keyboard,
  BookOpen,
  Feather,
  Sparkles,
  Scroll,
  Search,
  Download,
  FolderTree,
  Eye,
  Sliders,
  FileCheck2,
  HelpCircle
} from 'lucide-vue-next'
import { onClickOutside } from '@vueuse/core'
import { useUiStore } from '../stores/uiStore'

const uiStore = useUiStore()

const modalCardRef = ref<HTMLElement | null>(null)
const activeTab = ref<'shortcuts' | 'manuscript' | 'editor' | 'wiki'>('shortcuts')
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

const shortcutCategories: ShortcutCategory[] = [
  {
    title: 'Navegación y Vistas Tripartitas',
    items: [
      {
        keys: ['Ctrl', '1'],
        description: 'Mostrar u ocultar el Árbol del Manuscrito (panel izquierdo)',
        context: 'Global'
      },
      {
        keys: ['Ctrl', '2'],
        description: 'Enfocar el Lienzo de Escritura Central (prosa del capítulo)',
        context: 'Global'
      },
      {
        keys: ['Ctrl', '3'],
        description: 'Mostrar u ocultar la Wiki de Lore y Reglas del Mundo (panel derecho)',
        context: 'Global'
      },
      {
        keys: ['Ctrl', 'J'],
        description: 'Abrir o cerrar el Scratchpad (bloc de notas y captura rápida)',
        context: 'Global'
      },
      {
        keys: ['Ctrl', 'K'],
        description: 'Paleta de Comandos y Búsqueda Profunda de Texto en toda la obra',
        context: 'Global'
      },
      {
        keys: ['F1'],
        description: 'Abrir este Manual de Funcionalidades y Atajos',
        context: 'Global'
      }
    ]
  },
  {
    title: 'Editor y Escritura Inmersiva',
    items: [
      {
        keys: ['Ctrl', 'S'],
        description: 'Guardado forzado e instantáneo a la base de datos SQLite',
        context: 'Editor'
      },
      {
        keys: ['Ctrl', 'F'],
        description: 'Barra de búsqueda de texto dentro del capítulo activo (estilo VS Code)',
        context: 'Editor'
      },
      {
        keys: ['Ctrl', 'Shift', 'F'],
        description: 'Modo Enfoque Profundo (atenúa párrafos inactivos y barras laterales)',
        context: 'Editor'
      },
      {
        keys: ['Ctrl', 'Shift', 'T'],
        description: 'Modo Máquina de Escribir (Typewriter Mode — cursor centrado al 50vh)',
        context: 'Editor'
      },
      {
        keys: ['Ctrl', 'Alt', 'N'],
        description: 'Crear un nuevo capítulo o escena instantáneamente sin tocar el ratón',
        context: 'Manuscrito'
      },
      {
        keys: ['Ctrl', 'Clic'],
        description: 'Saltar a la ficha de la Wiki desde una entidad detectada en el texto',
        context: 'Editor'
      }
    ]
  },
  {
    title: 'Formato Tipográfico y Estilos',
    items: [
      {
        keys: ['Ctrl', 'B'],
        description: 'Aplicar o quitar formato Negrita',
        context: 'Editor'
      },
      {
        keys: ['Ctrl', 'I'],
        description: 'Aplicar o quitar formato Cursiva (itálica)',
        context: 'Editor'
      },
      {
        keys: ['Ctrl', 'U'],
        description: 'Aplicar o quitar Subrayado',
        context: 'Editor'
      },
      {
        keys: ['Ctrl', 'Shift', 'X'],
        description: 'Aplicar o quitar Tachado',
        context: 'Editor'
      },
      {
        keys: ['Ctrl', 'Alt', '1 / 2 / 3'],
        description: 'Convertir párrafo en Encabezado H1, H2 o H3',
        context: 'Editor'
      },
      {
        keys: ['Ctrl', 'Shift', 'B'],
        description: 'Convertir bloque en Cita editorial (Blockquote)',
        context: 'Editor'
      },
      {
        keys: ['Ctrl', 'Shift', 'S'],
        description: 'Insertar descanso de escena tipográfico (* * *)',
        context: 'Editor'
      },
      {
        keys: ['Ctrl', 'Z'],
        description: 'Deshacer último cambio de texto',
        context: 'Editor'
      },
      {
        keys: ['Ctrl', 'Y'],
        description: 'Rehacer último cambio de texto',
        context: 'Editor'
      }
    ]
  }
]

const filteredCategories = computed(() => {
  const query = shortcutSearchQuery.value.trim().toLowerCase()
  if (!query) return shortcutCategories

  return shortcutCategories
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
        class="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/55 backdrop-blur-sm select-none"
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
                  Atajos rápidos de teclado y guía exhaustiva de las funcionalidades del santuario
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

          <!-- Navigation Tabs -->
          <div
            class="px-6 pt-3 pb-2 flex items-center gap-2 border-b border-[var(--neu-border)] bg-[var(--bg-base)] overflow-x-auto shrink-0"
          >
            <button
              type="button"
              class="neu-btn px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs font-medium cursor-pointer transition-all"
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
              class="neu-btn px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs font-medium cursor-pointer transition-all"
              :class="{
                'neu-well !text-[var(--accent)] font-semibold shadow-inner':
                  activeTab === 'manuscript'
              }"
              @click="activeTab = 'manuscript'"
            >
              <FolderTree :size="14" />
              <span>Manuscrito y Estructura</span>
            </button>

            <button
              type="button"
              class="neu-btn px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs font-medium cursor-pointer transition-all"
              :class="{
                'neu-well !text-[var(--accent)] font-semibold shadow-inner': activeTab === 'editor'
              }"
              @click="activeTab = 'editor'"
            >
              <Feather :size="14" />
              <span>Editor, Prosa y Exportación</span>
            </button>

            <button
              type="button"
              class="neu-btn px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs font-medium cursor-pointer transition-all"
              :class="{
                'neu-well !text-[var(--accent)] font-semibold shadow-inner': activeTab === 'wiki'
              }"
              @click="activeTab = 'wiki'"
            >
              <Sparkles :size="14" />
              <span>Wiki Lore y Reglas del Mundo</span>
            </button>
          </div>

          <!-- Body Content -->
          <div class="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
            <!-- PESTAÑA 1: ATAJOS DE TECLADO -->
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
                  placeholder="Buscar atajo por comando, tecla o descripción..."
                  class="w-full neu-input pl-10 pr-4 py-2 text-xs rounded-xl focus:outline-none placeholder:text-[var(--text-muted)]"
                />
              </div>

              <div v-if="filteredCategories.length === 0" class="text-center py-10 text-[var(--text-muted)]">
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

            <!-- PESTAÑA 2: MANUSCRITO Y ESTRUCTURA -->
            <div v-else-if="activeTab === 'manuscript'" class="space-y-5">
              <div class="neu-panel p-5 rounded-xl border border-[var(--neu-border)] space-y-3">
                <div class="flex items-center gap-2 text-[var(--accent)]">
                  <FolderTree :size="18" />
                  <h3 class="font-editorial text-base font-bold">Árbol del Manuscrito (Panel Izquierdo)</h3>
                </div>
                <p class="text-xs text-[var(--text-secondary)] leading-relaxed">
                  El panel izquierdo organiza jerárquicamente la estructura narrativa de tu libro en <strong>Capítulos</strong> y <strong>Escenas</strong>. Puedes alternarlo en cualquier momento usando <kbd class="neu-well-sm px-1.5 py-0.5 text-[10px] font-mono text-[var(--accent)]">Ctrl+1</kbd> o arrastrar el divisor central para ajustar su ancho exacto.
                </p>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="neu-surface p-4 rounded-xl border border-[var(--neu-border)] space-y-2">
                  <h4 class="font-semibold text-xs text-[var(--text-primary)] flex items-center gap-1.5">
                    <BookOpen :size="14" class="text-[var(--accent)]" />
                    Gestión de Capítulos y Escenas
                  </h4>
                  <ul class="text-xs text-[var(--text-secondary)] space-y-1.5 list-disc list-inside">
                    <li><strong>Creación instantánea:</strong> Pulsa <kbd class="neu-well-sm px-1 text-[10px] font-mono">Ctrl+Alt+N</kbd> o los botones (+) para crear capítulos o escenas sin apartar las manos.</li>
                    <li><strong>Reordenación Drag & Drop:</strong> Arrastra y suelta capítulos o escenas libremente. El orden se guarda en SQLite en tiempo real.</li>
                    <li><strong>Edición de títulos en vivo:</strong> Haz clic en el nombre de cualquier capítulo para renombrarlo al instante.</li>
                  </ul>
                </div>

                <div class="neu-surface p-4 rounded-xl border border-[var(--neu-border)] space-y-2">
                  <h4 class="font-semibold text-xs text-[var(--text-primary)] flex items-center gap-1.5">
                    <FileCheck2 :size="14" class="text-[var(--accent)]" />
                    Estados Editoriales y Métricas
                  </h4>
                  <ul class="text-xs text-[var(--text-secondary)] space-y-1.5 list-disc list-inside">
                    <li><strong>Ciclo de vida por escena:</strong> Marca cada escena como <em>Borrador</em> (ámbar), <em>En curso</em> (azul) o <em>Finalizado</em> (verde).</li>
                    <li><strong>Conteo dinámico:</strong> Visualiza el total de palabras acumuladas por capítulo y por todo el libro.</li>
                    <li><strong>Papelera no destructiva:</strong> Los elementos eliminados van a la papelera (<kbd class="neu-well-sm px-1 text-[10px] font-mono">Papelera</kbd>) y pueden ser restaurados o purgados permanentemente.</li>
                  </ul>
                </div>
              </div>
            </div>

            <!-- PESTAÑA 3: EDITOR Y PROSA -->
            <div v-else-if="activeTab === 'editor'" class="space-y-5">
              <div class="neu-panel p-5 rounded-xl border border-[var(--neu-border)] space-y-3">
                <div class="flex items-center gap-2 text-[var(--accent)]">
                  <Feather :size="18" />
                  <h3 class="font-editorial text-base font-bold">Lienzo Central de Escritura & Motor TipTap</h3>
                </div>
                <p class="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Un santuario libre de distracciones diseñado para largas sesiones creativas. Cuenta con persistencia continua a disco, salvaguardas reactivas y herramientas tipográficas avanzadas.
                </p>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="neu-surface p-4 rounded-xl border border-[var(--neu-border)] space-y-2">
                  <h4 class="font-semibold text-xs text-[var(--text-primary)] flex items-center gap-1.5">
                    <Eye :size="14" class="text-[var(--accent)]" />
                    Modos de Inmersión y Enfoque
                  </h4>
                  <ul class="text-xs text-[var(--text-secondary)] space-y-1.5 list-disc list-inside">
                    <li><strong>Modo Máquina de Escribir (<kbd class="neu-well-sm px-1 text-[10px] font-mono">Ctrl+Shift+T</kbd>):</strong> Fija la línea activa del cursor exactamente en el centro de tu pantalla (50vh) para no forzar la vista hacia abajo.</li>
                    <li><strong>Modo Enfoque Profundo (<kbd class="neu-well-sm px-1 text-[10px] font-mono">Ctrl+Shift+F</kbd>):</strong> Atenúa todos los párrafos salvo el activo y oculta sutilmente los paneles laterales.</li>
                    <li><strong>Buscador dentro del capítulo (<kbd class="neu-well-sm px-1 text-[10px] font-mono">Ctrl+F</kbd>):</strong> Barra estilo VS Code para buscar, resaltar y navegar entre ocurrencias instantáneamente.</li>
                  </ul>
                </div>

                <div class="neu-surface p-4 rounded-xl border border-[var(--neu-border)] space-y-2">
                  <h4 class="font-semibold text-xs text-[var(--text-primary)] flex items-center gap-1.5">
                    <Download :size="14" class="text-[var(--accent)]" />
                    Maquetación y Exportación
                  </h4>
                  <ul class="text-xs text-[var(--text-secondary)] space-y-1.5 list-disc list-inside">
                    <li><strong>Compilación multiformato:</strong> Exporta toda la obra a <strong>.epub</strong> (lectores de libros electrónicos), <strong>.pdf</strong> (maquetación tipográfica lista para imprenta) o <strong>.docx</strong> (Word editable).</li>
                    <li><strong>Ajustes del Título de Capítulo:</strong> Personaliza la alineación (izquierda, centro, derecha), la línea divisoria decorativa, la tipografía específica y el color del título del capítulo.</li>
                    <li><strong>Tamaños de fuente híbridos:</strong> Usa el selector numérico para escribir decimales libres (ej. 11.5pt, 13.5pt) con validación inmediata.</li>
                  </ul>
                </div>
              </div>
            </div>

            <!-- PESTAÑA 4: WIKI Y REGLAS DEL MUNDO -->
            <div v-else-if="activeTab === 'wiki'" class="space-y-5">
              <div class="neu-panel p-5 rounded-xl border border-[var(--neu-border)] space-y-3">
                <div class="flex items-center gap-2 text-[var(--accent)]">
                  <Sparkles :size="18" />
                  <h3 class="font-editorial text-base font-bold">Wiki de Lore, Reglas del Mundo & Scratchpad</h3>
                </div>
                <p class="text-xs text-[var(--text-secondary)] leading-relaxed">
                  El panel derecho (<kbd class="neu-well-sm px-1.5 py-0.5 text-[10px] font-mono text-[var(--accent)]">Ctrl+3</kbd>) es tu enciclopedia de worldbuilding y biblia narrativa, sincronizada bidireccionalmente con el editor mediante detección reactiva de entidades.
                </p>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="neu-surface p-4 rounded-xl border border-[var(--neu-border)] space-y-2">
                  <h4 class="font-semibold text-xs text-[var(--text-primary)] flex items-center gap-1.5">
                    <Scroll :size="14" class="text-[var(--accent)]" />
                    Detección y Autovinculación en el Editor
                  </h4>
                  <ul class="text-xs text-[var(--text-secondary)] space-y-1.5 list-disc list-inside">
                    <li><strong>Decoraciones sin mutar el texto:</strong> Las menciones de tus personajes, lugares y objetos en la wiki se subrayan elegantemente sin ensuciar la base de datos SQLite.</li>
                    <li><strong>Hover Preview (0.9s):</strong> Al reposar el ratón 0.9 segundos sobre una entidad, se despliega una tarjeta flotante con su categoría, resumen y datos clave.</li>
                    <li><strong>Navegación con <kbd class="neu-well-sm px-1 text-[10px] font-mono">Ctrl+Clic</kbd>:</strong> Abre el panel de la Wiki, filtra la ficha correspondiente y la despliega con scroll automático.</li>
                  </ul>
                </div>

                <div class="neu-surface p-4 rounded-xl border border-[var(--neu-border)] space-y-2">
                  <h4 class="font-semibold text-xs text-[var(--text-primary)] flex items-center gap-1.5">
                    <Sliders :size="14" class="text-[var(--accent)]" />
                    Reglas del Canon & Scratchpad
                  </h4>
                  <ul class="text-xs text-[var(--text-secondary)] space-y-1.5 list-disc list-inside">
                    <li><strong>Axiomas y Reglas del Mundo:</strong> Documenta leyes inquebrantables de magia, tecnología o sociedad con condiciones, consecuencias y niveles de rigidez.</li>
                    <li><strong>Scratchpad / Bloc Rápido (<kbd class="neu-well-sm px-1 text-[10px] font-mono">Ctrl+J</kbd>):</strong> Cajón deslizable para capturar ideas repentinas, con notas fijadas, etiquetas de color y opción de "Promover a nuevo capítulo".</li>
                    <li><strong>Paleta Global (<kbd class="neu-well-sm px-1 text-[10px] font-mono">Ctrl+K</kbd>):</strong> Busca cualquier frase en todo el manuscrito o ejecuta acciones del sistema al vuelo.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div
            class="px-6 py-3 border-t border-[var(--neu-border)] bg-[var(--bg-surface)] flex items-center justify-between text-xs text-[var(--text-muted)] shrink-0"
          >
            <div class="flex items-center gap-3">
              <span class="font-mono text-[11px]">Folio Desktop v0.1.0</span>
              <span>·</span>
              <span>Pulsa <kbd class="neu-well-sm px-1.5 py-0.5 text-[10px] font-mono text-[var(--accent)] font-semibold">F1</kbd> para abrir esta guía en cualquier momento</span>
            </div>

            <button
              type="button"
              class="neu-btn px-4 py-1.5 rounded-lg text-xs font-semibold text-[var(--text-primary)] hover:!text-[var(--accent)] cursor-pointer transition-all"
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

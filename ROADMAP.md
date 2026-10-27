# Plan de Desarrollo y Arquitectura — Folio (Santuario Editorial)

Folio es una aplicación de escritorio **Local-First para novelistas y escritores**, construida con **Electron, Vue 3, TypeScript, Tailwind CSS y SQLite (better-sqlite3 + Drizzle ORM)**. Combina un manuscrito jerárquico (Capítulos y Escenas) con una librería enciclopédica dinámica (Wiki de Personajes, Lugares, Objetos e Ideas) bajo un diseño táctil de **Neumorfismo Cálido Editorial**.

---

## Principios de Diseño y Arquitectura
1. **Local-First Absoluto:** SQLite en el proceso Main de Electron con `journal_mode = WAL` y persistencia local inmediata. Cero servidores HTTP externos.
2. **IPC Tipado de Extremo a Extremo:** Drizzle ORM -> IPC Handlers (`src/main/ipc`) -> Preload (`src/preload`) -> Stores Pinia (`src/renderer/src/stores`).
3. **Warm Tactile Neumorphism:** Paleta oficial de Folio (`#F7F4EF`, `#DCD3C6`, `#261C14`, `#C85A32`) y Modo Oscuro Espresso (`#120E0B`, `#1C1612`, `#261E18`), con biseles y hendiduras realistas.
4. **Cero Fricción y Protección de Datos:** Guardado continuo debounced, flush sincronizado en navegación y reactividad instantánea en memoria (Zero-Lag).

---

## Resumen de Estado del Proyecto

| Fase | Módulo | Estado | Progreso |
| :--- | :--- | :---: | :---: |
| **Fase 1** | Núcleo de Datos, Manuscrito y Wiki Dinámica | ✅ Completada | 100% |
| **Fase 2** | Motor de Escritura y Lienzo Inmersivo | 🟡 Casi Completada | ~85% (Lienzo, Inmersión y Autosave listos; TipTap pendiente) |
| **Fase 3** | Paleta de Comandos y Búsqueda Global (`Ctrl+K`) | ⏳ Pendiente | 0% |
| **Fase 4** | Papelera de Reciclaje y Gestión de Archivados (UI) | ⏳ Pendiente | Backend 100% / UI 0% |
| **Fase 5** | Exportación Editorial y Respaldos Físicos | ⏳ Pendiente | 0% |
| **Fase 6** | Módulos Narrativos Avanzados (Visión Futura) | 🔭 Planificada | 0% |

---

## 🟢 Lo que HAY en la App (Implementado y Operativo)

### 1. Núcleo Local-First e Infraestructura de Datos
- [x] **Base de Datos Relacional SQLite (`better-sqlite3` + `Drizzle ORM`):**
  - Tabla `projects` (Libros/Novelas: título, género, sinopsis, fechas de creación y actualización).
  - Tabla `folios` (Capítulos raíz y Escenas anidadas mediante `parentId`, orden, estado, contenido).
  - Tabla `lore_items` (Wiki con categoría dinámica y atributos personalizados en JSON).
  - Índices optimizados para claves foráneas y búsquedas por proyecto, tipo y estado de archivado.
  - Modo WAL activado e integridad referencial en cascada (`ON DELETE CASCADE`).
- [x] **IPC y Preload Tipados:** Exposición segura de `window.api.project`, `window.api.folio`, `window.api.lore` y `window.api.window`.
- [x] **Semillado Automático Inicial (Seeding):** Si la base de datos está vacía, se inicializa el proyecto de demostración *"El Archivo de las Sombras"* con capítulos, escenas y entradas de lore.
- [x] **Separación de Entornos:** `./dev.db` en desarrollo y `userData/folio.db` en modo empaquetado producción.

### 2. Gestión de Proyectos / Libros
- [x] **Selector Táctil de Libros (`BookSelector.vue`):** Desplegable neumórfico con indicador de obra activa y acceso directo para crear nuevos libros.
- [x] **Creación Asistida (`ProjectModal.vue`):** Modal para nuevos proyectos con título, género y sinopsis. Inicializa automáticamente un "Capítulo I" para escribir de inmediato.
- [x] **Eliminación Segura de Proyectos:** Modal de confirmación neumórfica para eliminar obras con eliminación en cascada de sus documentos asociados.
- [x] **Persistencia de Sesión:** Recordatorio automático del último proyecto abierto vía `localStorage`.

### 3. Manuscrito y Organización Jerárquica
- [x] **Árbol de Capítulos y Escenas:** Navegación en acordeón con colapso/expansión individual por capítulo.
- [x] **Creación Guiada:** Botón para crear capítulos y botones contextuales en cada capítulo para añadir nuevas escenas subordinadas.
- [x] **Selector de Estado Editorial Táctil:** Menú personalizado para clasificar escenas en *Borrador* (ámbar), *En curso* (azul cielo) o *Finalizado* (verde esmeralda).
- [x] **Archivado Rápido a Papelera:** Botón en árbol de escenas y en cabecera para mover escenas a papelera lógica (`isArchived = true`).

### 4. Librería de Datos / Wiki de Lore (Worldbuilding)
- [x] **Conmutador de Modos:** Alternancia en barra lateral entre el manuscrito y la wiki.
- [x] **Categorías Dinámicas:** Categorías estándar (*personaje*, *lugar*, *objeto*, *idea*, *pensamiento*) y creación de categorías personalizadas directas.
- [x] **Filtrado por Categorías:** Barra horizontal de chips de categorías con contador reactivo de registros.
- [x] **Ficha Enciclopédica Completa:** Nombre, categoría editable, resumen de una línea, atributos dinámicos clave-valor y área de historia/biografía extensa.
- [x] **Gestor de Atributos Clave-Valor:** Inserción y eliminación de propiedades personalizadas en chips visuales.

### 5. Motor de Escritura, Lienzo y Autoguardado
- [x] **Autoguardado Inteligente (Debounce 500ms):** Persistencia en SQLite tras medio segundo de inactividad de escritura.
- [x] **Zero-Lag Reactivity:** Actualización instantánea en memoria (Pinia) de títulos, contenidos y estados en el sidebar y cabeceras mientras se teclea.
- [x] **Salvaguarda Forzada (*Flush Save*):** Guardado garantizado antes de cambiar de folio, entrada de wiki o proyecto, y al descargar la ventana (`beforeunload`).
- [x] **Guardado Manual Inmediato:** Forzado de persistencia en 1 clic o mediante atajo de teclado `Ctrl+S` / `Cmd+S`.
- [x] **Indicador Visual Reactivo:** Barra de estado superior con punto led interactivo (*Guardado local*, *Sin guardar...*, *Guardando...* y *Error*).
- [x] **Lienzo Editorial Distraction-Free:** Columna dorada de lectura/escritura (`max-w-3xl`) con tipografía narrativa serif (`font-editorial`).
- [x] **Métricas en Tiempo Real:** Contador de palabras, contador de caracteres y tiempo de lectura estimado (`~X min de lectura`).
- [x] **Contador de Palabras de Sesión en Vivo:** Registro reactivo `+Y sesión` en `folioStore.ts` con cálculo neto acumulativo y badge terracota.
- [x] **Modo Máquina de Escribir (Typewriter Scrolling):** Bloqueo permanente del cursor en el centro vertical de la pantalla (50vh) con desplazamiento del texto hacia arriba conforme se redacta, se pulsa Enter o se navega con flechas, manteniendo siempre la línea de escritura fija en la mirada.
- [x] **Modo Enfoque en Párrafo (Focus Mode):** Conmutador de inmersión visual que atenúa controles, notas y métricas al 25% y proyecta un spotlight nítido (100% contraste) sobre el párrafo activo mientras suaviza todos los párrafos ajenos al 18%, sobre un `<textarea>` 100% nativo.
- [x] **Atajos de Productividad e Inmersión:**
  - `Ctrl+S` / `Cmd+S`: Guardado manual forzado.
  - `Ctrl+N` / `Cmd+N`: Nueva escena rápida con foco inmediato en el título.
  - `Ctrl+B` / `Cmd+B`: Ocultar o mostrar barra lateral sin elementos flotantes superpuestos.
  - `Ctrl+Shift+T` / `Cmd+Shift+T`: Alternar Modo Máquina de Escribir.
  - `Ctrl+Shift+F` / `Cmd+Shift+F`: Alternar Modo Enfoque.
  - `Tab`: Indentación de 2 espacios en el área de prosa sin pérdida de foco.
- [x] **Scrollbar Editorial Delgado:** Barra de desplazamiento estilizada (`.editorial-scrollbar`) adaptada a los colores del tema.

### 6. Interfaz y Experiencia Visual
- [x] **Diseño Warm Neumorphism:** Superficies elevadas (`neu-surface`), hendiduras (`neu-well`), botones táctiles y acento terracota oficial (`#C85A32`).
- [x] **Tema Dual Claro / Oscuro:** Modo Papel Claro cálido por defecto y Modo Espresso Oscuro con fondos café tostado (`#120E0B`), conmutables en la barra superior.
- [x] **Barra de Título Frameless:** Botones nativos de minimizar, maximizar/restaurar y cerrar, con región de arrastre y logo oficial de Folio.
- [x] **Barra Lateral Colapsable:** Ocultable para máxima concentración directamente desde la cabecera o mediante `Ctrl+B`.
- [x] **Pantalla de Carga (*AppSplash*):** Bienvenida táctil con logotipo y barra de progreso al iniciar.

---

## 🔴 Lo que FALTA por Desarrollar (Próximas Fases)

---

### ⏳ Fase 2 (Restante): Editor de Texto Enriquecido TipTap
*Actualmente el editor cuenta con lienzo inmersivo (Máquina de escribir ergonómica, Modo Enfoque con viñeta CSS nativa, autoguardado, métricas de sesión). Falta dotarlo de capacidades WYSIWYG avanzadas:*

- [ ] **Instalación y Configuración de TipTap:**
  - Integrar `@tiptap/vue-3`, `@tiptap/starter-kit` y extensiones requeridas.
  - Preservar el sistema actual de autoguardado (Debounce 500ms + Zero-Lag + Flush al cambiar de documento) y los modos inmersivos.
- [ ] **Formato Enriquecido Básico:**
  - Negrita (`Ctrl+B` en texto seleccionado), cursiva (`Ctrl+I`), subrayado y tachado.
  - Encabezados de sección (H1, H2, H3) para subtítulos dentro de escenas largas.
  - Bloques de citas (*blockquotes*) para pensamientos o pasajes destacados.
  - Listas ordenadas y no ordenadas.
- [ ] **Menú Flotante Táctil (*Bubble Menu*):**
  - Barra de herramientas flotante con relieve neumórfico que aparece al seleccionar un fragmento de texto.
- [ ] **Elementos Editoriales Específicos:**
  - Separador de escena o descanso tipográfico (*Scene Break* / florón o asteriscos centrados `* * *`).
  - Notas al pie o comentarios al margen sobre el manuscrito.

---

### ⏳ Fase 3: Paleta de Comandos y Búsqueda Global (`Ctrl+K`)
*Herramienta central de navegación rápida sin despegar las manos del teclado:*

- [ ] **Modal Omnibox / Paleta (`Ctrl+K` o `Cmd+K`):**
  - Ventana modal flotante neumórfica invocable globalmente desde cualquier parte de la aplicación.
- [ ] **Búsqueda Global Instantánea:**
  - Indexación y búsqueda en tiempo real de títulos y contenidos en capítulos, escenas y entradas de la wiki de lore.
  - Filtro por tipo de resultado (Escena, Capítulo, Personaje, Lugar, Objeto, etc.).
- [ ] **Acciones Rápidas del Sistema:**
  - Comandos ejecutables desde el buscador: *"Nuevo capítulo"*, *"Nueva escena"*, *"Crear personaje"*, *"Cambiar a Modo Oscuro/Claro"*, *"Alternar barra lateral"*.
- [ ] **Navegación Completa por Teclado:**
  - Selección con flechas arriba/abajo (`↑` / `↓`) y apertura con `Enter`.

---

### ⏳ Fase 4: Papelera de Reciclaje y Gestión de Archivados (Interfaz de Usuario)
*El backend y los stores ya cuentan con métodos de papelera (`getTrash`, `restoreFromTrash`, `deletePermanently`), pero falta la interfaz dedicada:*

- [ ] **Vista / Modal de Papelera:**
  - Sección accesible desde la barra lateral o ajustes para ver elementos archivados.
  - Pestañas separadas para *Escenas Archivadas* y *Fichas de Lore Archivadas*.
- [ ] **Acciones de Recuperación:**
  - Botón *"Restaurar"* en 1 clic para devolver el elemento a su capítulo o categoría original.
- [ ] **Purga Definitiva:**
  - Botón de eliminación permanente con confirmación de seguridad.
  - Botón *"Vaciar papelera"* para limpiar todos los registros archivados en la base de datos SQLite.

---

### ⏳ Fase 5: Exportación Editorial y Respaldos Físicos
*Capacidades para extraer el libro a formatos estándar y asegurar la obra:*

- [ ] **Exportación del Manuscrito:**
  - Exportación de la obra completa o capítulos individuales a Markdown (`.md`).
  - Exportación a documento de Word (`.docx`) con formato editorial (estilos para títulos de capítulo y escenas).
  - Exportación a texto plano (`.txt`) o compilar para PDF limpio.
- [ ] **Exportación de la Wiki / Fichas de Lore:**
  - Compilado de la biblia del mundo literario en formato Markdown estructurado.
- [ ] **Respaldos Físicos en 1 Clic:**
  - Función de respaldo rápido que copia el archivo físico de la base de datos (`dev.db` o `folio.db`) hacia cualquier carpeta local elegida por el usuario vía diálogo nativo del sistema.
  - Opción de restaurar o importar una base de datos de respaldo externa.

---

### 🔭 Fase 6: Módulos Narrativos Avanzados (Visión Futura)
*Herramientas especializadas de alta productividad para escritores de novelas:*

- [ ] **Tablero de Corcho / Corkboard:**
  - Vista en cuadrícula de tarjetas de escenas con sinopsis y estado, permitiendo reordenar capítulos visualmente mediante Drag & Drop.
- [ ] **Enlaces Rápidos a la Wiki en el Texto:**
  - Detección de menciones (ej. escribir `@Aria` o `[[El Sello de Cera]]`) con popover informativo de la ficha del personaje u objeto.
- [ ] **Línea de Tiempo / Cronología (*Timeline*):**
  - Módulo cronológico para ubicar escenas en el tiempo de la historia y evitar anacronismos o incoherencias temporales.
- [ ] **Objetivos y Metas de Escritura:**
  - Meta de palabras por sesión (ej. 1.000 palabras hoy) con barra de progreso.
  - Historial de palabras escritas por día y contador de racha de escritura.
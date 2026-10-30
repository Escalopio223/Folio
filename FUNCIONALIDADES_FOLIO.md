# Catálogo Completo de Funcionalidades — Folio (Santuario Editorial)

**Folio** es un entorno de escritura creativa y *worldbuilding* de escritorio (**Local-First**) construido con **Electron, Vue 3, TypeScript, Pinia, Tailwind CSS v4, TipTap y SQLite (`better-sqlite3` + `Drizzle ORM`)**.

Este documento recopila de forma exhaustiva **todas las funcionalidades existentes** actualmente en la aplicación.

---

## 1. Arquitectura Local-First y Base de Datos SQLite

- **Persistencia 100% Local y Sin Latencia (`src/main/db/index.ts`, `src/main/db/schema.ts`)**:
  - Motor SQLite embebido con `journal_mode = WAL` (*Write-Ahead Logging*) y `foreign_keys = ON` con borrado en cascada (`ON DELETE CASCADE`).
  - Separación automática de base de datos: `./dev.db` en entorno de desarrollo y `userData/folio.db` en producción.
- **Migraciones Automáticas No Destructivas**:
  - Inspección dinámica del esquema (`PRAGMA table_info`) al arrancar la aplicación para añadir nuevas tablas o columnas sin perder datos existentes.
- **Semillado Inicial (*Seeding*)**:
  - Si la base de datos está vacía al abrir Folio por primera vez, se crea automáticamente la obra de demostración *«El Archivo de las Sombras»* con capítulos, escenas, fichas de Lore y reglas del mundo.
- **7 Tablas Relacionales**:
  1. `projects`: Libros/obras literarias (`id`, `title`, `genre`, `synopsis`, `createdAt`, `updatedAt`).
  2. `folios`: Capítulos raíz y escenas anidadas (`parentId`, `title`, `content`, `synopsis`, `status`, `wordCount`, `orderIndex`, `isArchived`).
  3. `lore_items`: Entradas de la Wiki (`category`, `name`, `summary`, `content`, `attributes` en JSON, `isArchived`).
  4. `world_rules`: Leyes y axiomas del universo narrativo (`category`, `title`, `summary`, `conditions`, `consequences`, `exceptions`, ` strictness`, `isPinned`, `isArchived`).
  5. `scratchpad_notes`: Notas rápidas del bloc (`title`, `content`, `colorTag`, `isPinned`, `orderIndex`).
  6. `project_goals`: Configuración de metas por libro (`targetTotalWords`, `dailyWordGoal`, `dailySceneGoal`, `dailyChapterGoal`, `deadlineDate`, `askSessionGoalOnStartup`).
  7. `daily_writing_logs` y `unlocked_achievements`: Historial diario de palabras/escenas/capítulos/rachas y registro de logros desbloqueados.

---

## 2. Gestión de Proyectos / Libros (`BookSelector.vue`, `ProjectModal.vue`)

- **Selector Táctil de Obras**:
  - Menú desplegable neumórfico en el panel izquierdo para cambiar entre novelas o proyectos al instante.
  - Recuerda automáticamente el último libro abierto mediante `localStorage`.
- **Creación Asistida de Nuevos Libros**:
  - Modal para definir **Título**, **Género literario** y **Sinopsis**.
  - Inicializa automáticamente el *«Capítulo I»* y su primera escena para empezar a escribir sin pasos intermedios.
- **Eliminación Segura de Proyectos**:
  - Confirmación de seguridad antes de eliminar un libro y todos sus datos vinculados en cascada.

---

## 3. Interfaz Tripartita Redimensionable y Ventana Nativa

- **Apertura en Ventana Completa**:
  - La aplicación se abre maximizada por defecto (`mainWindow.maximize()`) para ofrecer todo el espacio de trabajo desde el primer segundo.
- **Barra de Título Personalizada (`TitleBar.vue`)**:
  - Controles nativos de ventana (*Minimizar*, *Maximizar/Restaurar*, *Cerrar*).
  - Conmutadores rápidos para **Manuscrito** (`Ctrl+B`), **Buscador / Omnibox** (`Ctrl+K`), **Wiki** (`Ctrl+N`), **Scratchpad** (`Ctrl+J`) y **Personalizador de Colores**.
- **Layout Tripartito con Redimensionadores Táctiles (`PanelResizer.vue`)**:
  - **Panel Izquierdo (Árbol del Manuscrito)**: Ancho redimensionable arrastrando el borde (`200px` – `480px`) y colapsable con `Ctrl+B`.
  - **Lienzo Central (Editor de Prosa)**: Columna editorial centrada y adaptable.
  - **Panel Derecho (Inspector de Wiki y Reglas del Mundo)**: Ancho redimensionable (`260px` – `640px`) y colapsable con `Ctrl+N`.
  - Doble clic sobre cualquier divisor o comando en `Ctrl+K` para restablecer los anchos por defecto.

---

## 4. Árbol del Manuscrito y Organización Jerárquica (`DashboardView.vue`, `folioStore.ts`)

- **Estructura de Capítulos y Escenas**:
  - Acordeones por capítulo con conteo individual de escenas y palabras.
  - Creación en 1 clic de nuevos capítulos y nuevas escenas dentro de cada capítulo (`Ctrl+Alt+N`).
- **Reordenación Visual (Drag & Drop)**:
  - Arrastrar y soltar escenas (incluso entre distintos capítulos) y reordenar capítulos con persistencia inmediata de `orderIndex` en SQLite.
- **Estados Editoriales por Escena**:
  - Selector táctil con tres estados:
    - **Borrador** (Ámbar)
    - **En curso** (Azul cielo)
    - **Finalizado** (Verde esmeralda)
- **Exclusión Automática de Archivados**:
  - Cualquier escena o capítulo enviado a la Papelera (`isArchived = true`) se excluye inmediatamente del conteo total de palabras del libro y de las métricas.

---

## 5. Motor de Escritura Enriquecido (TipTap) e Inmersión (`TiptapEditor.vue`)

- **Formato Editorial Enriquecido (WYSIWYG)**:
  - Basado en **TipTap** con soporte para **Negrita**, *Cursiva*, <u>Subrayado</u>, ~~Tachado~~, Encabezados (`H1`, `H2`, `H3`), Citas (*Blockquote*), Listas con viñetas/numeradas y Alineación de texto (izquierda, centro, derecha, justificado).
- **Menú Flotante Contextual (*Bubble Menu*)**:
  - Aparece suavemente al seleccionar texto para aplicar formato o insertar separadores sin apartar la vista del párrafo.
- **Separadores Narrativos de Escena (`SceneBreak.ts`)**:
  - Inserción de descansos tipográficos (`* * *`) centrados y protegidos como nodos atómicos dentro del manuscrito.
- **Modo Máquina de Escribir (*Typewriter Mode* — `TypewriterMode.ts`)**:
  - Mantiene la línea activa del cursor centrada verticalmente en la pantalla (`50vh`) mientras escribes o navegas entre líneas (`Ctrl+Shift+T`).
- **Modo Enfoque Profundo (*Focus Mode* — `FocusMode.ts`)**:
  - Atenúa todos los párrafos inactivos del editor al `20%` de opacidad y reduce la visibilidad de las barras laterales y superiores al `12%` (recuperando el `100%` al pasar el cursor por encima), manteniendo el título del capítulo y el párrafo actual completamente nítidos (`Ctrl+Shift+F`).
- **Autoguardado Reactivo + Salvaguarda Forzada (*Flush Save*)**:
  - Guardado automático con *debounce* de `500ms` tras dejar de teclear.
  - Guardado inmediato forzado al cambiar de escena, capítulo o proyecto, al cerrar la ventana (`beforeunload`) o al pulsar `Ctrl+S`.
  - Indicador de estado en tiempo real (*Guardado*, *Guardando...*, *Cambios pendientes*).
- **Métricas en Vivo**:
  - Conteo de palabras de la escena activa, caracteres, tiempo estimado de lectura (`~X min`) y balance neto de palabras escritas en la sesión actual (`+Y sesión`).

---

## 6. Wiki Dinámica de Lore (`WikiInspector.vue`, `loreStore.ts`)

- **Categorías Dinámicas y Personalizables**:
  - Categorías base (*Personaje*, *Lugar*, *Objeto*, *Idea*, *Facción*) más creación libre de cualquier categoría personalizada.
- **Filtrado y Búsqueda Instantánea**:
  - Chips horizontales con contador por categoría y buscador en tiempo real por nombre, resumen, contenido o atributos.
- **Fichas Enciclopédicas con Atributos Clave-Valor**:
  - Cada entrada de Lore incluye **Nombre**, **Categoría**, **Resumen corto**, **Atributos dinámicos clave-valor** (ej. *Edad: 34*, *Linaje: Casa Vael*) y **Desarrollo extenso**.

---

## 7. Reglas del Mundo y Canon (`WorldRulesList.vue`, `RuleCard.vue`, `RuleEditModal.vue`)

- **Pestaña Dedicada en el Inspector Derecho (`Wiki` ⇄ `Reglas`)**:
  - Diseñada para documentar las leyes inquebrantables del universo narrativo (sistemas de magia, tecnología, leyes físicas o sociales).
- **Plantillas Predefinidas (`rulePresets.ts`)**:
  - *Ley Dura*, *Límite / Coste*, *Axioma del Mundo*, *Código Social / Político*, *Sistema de Magia / Tecnología*.
- **Estructura Causal de Cada Regla**:
  - **Título y Categoría**
  - **Nivel de Rigidez (*Strictness*)**: *Inquebrantable (Canon Absoluto)*, *Estructural (Con Raras Excepciones)* o *Flexible (Tendencia Cultural)*.
  - **Resumen / Enunciado**
  - **Condiciones de Activación** (*¿Cuándo aplica?*)
  - **Consecuencias / Coste** (*¿Qué ocurre si se cumple o se viola?*)
  - **Excepciones Conocidas** (*¿Quién o qué puede romperla?*)
- **Fijado de Reglas Críticas (`isPinned`)**:
  - Permite anclar las leyes fundamentales en la parte superior del inspector.

---

## 8. Scratchpad / Bloc de Captura Rápida (`ScratchpadDrawer.vue`, `scratchpadStore.ts`)

- **Cajón Flotante Global (`Ctrl+J` / `Cmd+J`)**:
  - Accesible desde la barra superior, el pie de página o mediante atajo de teclado sin abandonar la escena actual.
- **Captura Instantánea de Ideas**:
  - Creación rápida de notas sueltas vinculadas al libro activo, con autoguardado continuo.
- **Etiquetas de Color, Fijado y Búsqueda**:
  - Clasificación por colores (*Ámbar*, *Terracota*, *Esmeralda*, *Cielo*, *Violeta*, *Neutro*), fijado de notas importantes (`isPinned`) y filtro de búsqueda propio.

---

## 9. Paleta de Comandos y Omnibox Global (`CommandPaletteModal.vue`, `commandsRegistry.ts`)

- **Invocación Global con `Ctrl+K` / `Cmd+K`**:
  - Buscador universal y lanzador de acciones sin levantar las manos del teclado.
- **Búsqueda Transversal en Todo el Proyecto**:
  - Busca simultáneamente en **Capítulos**, **Escenas** (título y prosa), **Fichas de Lore** y **Reglas del Mundo**, mostrando fragmentos de contexto (*snippets*) con el término resaltado.
- **Salto y Resaltado en el Editor (`SearchHighlight.ts`)**:
  - Al seleccionar un resultado de búsqueda dentro de una escena, Folio abre esa escena, desplaza el scroll hasta la coincidencia y la ilumina temporalmente en el texto.
- **Catálogo de Acciones Rápidas del Sistema**:
  - Crear capítulo/escena/ficha de lore/regla/nota de scratchpad, abrir el Ritual de Inicio de sesión, abrir la Vitrina de Logros, personalizar el tema de 3 colores, alternar Modo Enfoque, abrir la Papelera o restablecer el tamaño de los paneles.

---

## 10. Papelera de Reciclaje y Cementerio de Capítulos (`TrashModal.vue`, `trashStore.ts`)

- **Gestión Unificada de Elementos Archivados**:
  - Clasifica los elementos descartados en **Capítulos y Escenas**, **Fichas de Lore** y **Reglas del Mundo**.
- **Restauración Inteligente en 1 Clic**:
  - Devuelve cualquier escena, capítulo, ficha de lore o regla a su lugar original (y si el capítulo padre de una escena fue eliminado, la reubica de forma segura).
- **Purga Definitiva o Vaciado Completo**:
  - Eliminación física individual (`DELETE`) o vaciado total de la papelera con confirmación de seguridad.

---

## 11. Sistema de Metas Flexibles y 48 Logros Editoriales (`goalsStore.ts`, `achievementsCatalog.ts`)

- **1. «Ritual de Inicio» al Abrir la App (`SessionGoalPromptModal.vue`)**:
  - Invitación cálida al abrir Folio para elegir un propósito de sesión en 1 clic:
    - *Pluma Ligera* (`250 palabras`)
    - *Ritmo Editorial* (`500 palabras`)
    - *Inmersión Profunda* (`1.000 palabras`)
    - *Avance de Estructura* (`1 Escena` o `1 Capítulo`)
    - *Meta Personalizada* (número libre de palabras, escenas o capítulos)
    - *Escritura Libre (Sin meta)* + casilla para no volver a preguntar al iniciar.
- **2. Píldora de Progreso en Vivo (`GoalsProgressPill.vue`)**:
  - Situada en la barra del editor: muestra priorizadamente la **Meta de Sesión** activa (o la **Meta Diaria** si se escribe en modo libre), el contador de **Racha activa (`🔥 X días`)** y el total de logros desbloqueados.
  - Barra de progreso con transición cromática hacia verde esmeralda (`#2E7D32`) al alcanzar el `100%`.
  - Respeta el **Modo Enfoque** atenuándose al `12%` para no distraer.
- **3. Panel de Expectativas y Vitrina de 48 Logros (`GoalsAndAchievementsModal.vue`)**:
  - **Pestaña Expectativas & Progreso**:
    - Tarjeta de progreso total del manuscrito con palabras restantes, ritmo estimado de sesiones y cuenta atrás opcional de fecha límite.
    - Modificación o reinicio en caliente de la **Meta de Sesión Actual**.
    - Línea de tiempo visual de los **últimos 7 días** sincronizada en vivo.
    - Configuración con botones `+ / -` y presets rápidos para **Palabras/día**, **Escenas/día**, **Capítulos/día** y **Meta Total del Libro** (*Relato 10k*, *Novela Corta 30k*, *Novela 60k*, *Épica 100k+*).
  - **Pestaña Vitrina de Logros (48 Hitos en 4 Categorías)**:
    1. *Logros de Tus Propias Metas* (13 logros dinámicos de sesión y jornada).
    2. *Hitos del Manuscrito — Volumen de la Obra* (14 logros desde *Primeras Líneas* hasta *Obra Magna* al 100% de tu objetivo y *Catedral de Palabras* con 150.000 palabras).
    3. *Constancia y Oficio* (16 logros de rachas de 2 a 60 días, días activos acumulados y escenas/capítulos finalizados).
    4. *Universo, Lore y Herramientas* (5 logros de construcción de mundo en Wiki, Reglas del Canon y Scratchpad).
- **4. Notificación Celebratoria No Intrusiva (`AchievementToast.vue`)**:
  - Toast flotante en la esquina inferior derecha durante `4.5 segundos` con cola secuencial y `pointer-events-none` para no robar jamás el foco ni interrumpir el tecleo en TipTap.

---

## 12. Sistema de Tema Personalizado de 3 Colores con Neumorfismo Táctil (`ThemeCustomizerModal.vue`, `uiStore.ts`, `main.css`)

- **Modo Claro (*Papel Cálido*) por Defecto**:
  - Configuración inicial cálida y descansada para la vista (`#C85A32` en botones, `#261C14` en texto y `#EFEAE1` en fondo).
- **Configuración Libre de 3 Colores Maestros**:
  1. **Botones y bordes**: Selector cromático visual (`Elegir color` con cuentagotas), input `HEX` editable y muestras rápidas.
  2. **Texto**: Color principal de lectura; genera automáticamente las gamas de texto secundario y sutil.
  3. **Fondo de la aplicación**: Lienzo base; genera automáticamente mediante filtros cromáticos (`color-mix(in oklab, ...)` y desplazamientos HSL) todas las capas de superficie, pozos hundidos, biseles neumórficos y tarjetas de gamificación.
- **Control de Intensidad de Capas del Fondo (`50%` – `150%`)**:
  - Permite graduar en tiempo real la profundidad del contraste entre el fondo base, los paneles elevados y las tarjetas.
- **6 Temas Predefinidos (3 Claros + 3 Oscuros Muy Diferenciados)**:
  - **Temas Claros**: *Papel Cálido (Por defecto)*, *Bosque Esmeralda* y *Brisa Atlántica*.
  - **Temas Oscuros**: *Espresso Nocturno*, *Abismo Oceánico* y *Terciopelo Amatista*.
- **Acabado Neumórfico Esculpido**:
  - Todos los botones (`.neu-btn`, `.neu-btn-terracotta`, `.neu-icon-btn`, `.neu-swatch`, `.neu-preset-btn`) cuentan con relieve convexo, doble sombra proyectada, bisel especular superior y estado presionado cóncavo.


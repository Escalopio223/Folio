# Plan de Desarrollo y Arquitectura — Folio (Santuario Editorial)

Folio es una aplicación de escritorio **Local-First para novelistas y escritores**, construida con **Electron, Vue 3, TypeScript, Tailwind CSS y SQLite (better-sqlite3 + Drizzle ORM)**. Combina un manuscrito jerárquico (Capítulos y Escenas) con una librería enciclopédica dinámica (Wiki de Personajes, Lugares, Objetos e Ideas) bajo un diseño táctil de **Neumorfismo Cálido Editorial**.

---

## Principios de Diseño y Arquitectura
1. **Local-First Absoluto:** SQLite en el proceso Main de Electron con WAL mode y persistencia local inmediata. Cero servidores HTTP.
2. **IPC Tipado de Extremo a Extremo:** Drizzle ORM -> IPC Handlers (`src/main/ipc`) -> Preload (`src/preload`) -> Stores Pinia (`src/renderer/src/stores`).
3. **Warm Tactile Neumorphism:** Paleta oficial de Folio (`#F7F4EF`, `#DCD3C6`, `#261C14`, `#C85A32`) y Modo Oscuro Espresso (`#120E0B`, `#1C1612`, `#261E18`), con biseles y hendiduras realistas.

---

## Estado de las Fases del Proyecto

### ✅ Fase 1: Núcleo de Datos, Manuscrito y Wiki Dinámica (`feat/core-schema-and-cleanup`)
- [x] **Base de Datos Relacional (`src/main/db/schema.ts`):**
  - Tabla `projects` (Libros/Novelas: título, género, sinopsis, fechas).
  - Tabla `folios` (Capítulos como raíces y Escenas anidadas con `parentId = chapterId`, orden, estado).
  - Tabla `lore_items` (Wiki con categoría dinámica y atributos personalizados en JSON).
- [x] **IPC y Preload Tipados:** Exposición segura de `window.api.project`, `window.api.folio`, `window.api.lore` y `window.api.window`.
- [x] **Menú Lateral Colapsable:**
  - Ocultable/mostrable mediante botón en barra de título, atajo de teclado global `Ctrl+B` y botón flotante en lienzo.
  - Transición fluida con animación neumórfica.
- [x] **Pantalla de Carga / Splash Screen (`AppSplash.vue`):**
  - Muestra el emblema oficial de Folio con halo pulsante táctil.
  - Mensaje *"Cargando el archivo... / Preparando tu santuario de escritura..."* con barra de progreso.
- [x] **Selector y Creación de Libros (`ProjectModal.vue`):**
  - Modal para dar de alta nuevos proyectos editoriales.
- [x] **Árbol de Manuscrito (Capítulos y Escenas):**
  - Navegación en acordeón por capítulos, creación de escenas subordinadas, contador de palabras y caracteres, estados de escena (*Borrador*, *En curso*, *Finalizado*).
- [x] **Librería de Datos / Wiki Dinámica:**
  - Categorías dinámicas (Personajes, Lugares, Objetos, Ideas, Ideales, Pensamientos y personalizadas).
  - Gestor de atributos dinámicos clave-valor (ej: Rol, Edad, Rasgo, Alineamiento, Simbología).
  - Resumen rápido y biografía/notas extensas.

---

### ⏳ Fase 2: Motor de Escritura por Bloques y TipTap (`feat/rich-editor-autosave`)
- [x] **Autoguardado Inteligente (Debounce 500ms):**
  - Actualización instantánea en memoria en Pinia (cero retraso / Zero-Lag en el sidebar y headers).
  - Persistencia debounced a 500ms en SQLite vía IPC.
  - Indicador visual táctil en la barra de herramientas superior (*Guardando...*, *Guardado local*, *Sin guardar...* con timestamp y punto reactivo).
  - Salvaguarda forzada (*flush*) al cambiar de folio, entrada de wiki o proyecto para evitar pérdida de datos.
- [x] **Lienzo Editorial Distraction-Free:**
  - Tipografía narrativa centrada en columna dorada (`max-w-3xl mx-auto`, `font-editorial text-lg leading-loose`).
  - Scrollbar delgado y elegante con variables neumórficas (`.editorial-scrollbar`).
  - Atajos de productividad: `Ctrl+S` (guardado forzado inmediato), `Ctrl+N` (nueva escena/folio rápido), `Tab` (indentación de 2 espacios sin pérdida de foco).
  - Estimación de tiempo de lectura (`~X min de lectura`) y estadísticas de palabras/caracteres en tiempo real.
- [ ] Integración de TipTap (`@tiptap/vue-3`, `@tiptap/starter-kit`, extensiones).
- [ ] Menú flotante (*Bubble Menu*) táctil con relieve neumórfico.

---

### ⏳ Fase 3: Paleta de Comandos y Búsqueda Global (`feat/command-palette-and-search`)
- [ ] Modal `Ctrl+K` / `Cmd+K` para buscar al instante escenas o entradas de la wiki de lore.
- [ ] Acciones rápidas mediante teclado (*"Nuevo capítulo"*, *"Nueva escena"*, *"Alternar menú lateral"*, etc.).

---

### ⏳ Fase 4: Exportación y Respaldos Físicos (`feat/local-backups-and-export`)
- [ ] Exportación del manuscrito completo o por capítulos a `.md` o `.docx`.
- [ ] Respaldo en 1 clic de la base de datos `dev.db` hacia cualquier carpeta del sistema operativo.
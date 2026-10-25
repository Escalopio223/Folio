# Plan de Desarrollo y Estrategia de Ramas — Folio

Folio sigue un desarrollo iterativo basado en ramas funcionales (*Feature Branches*) de corte vertical. Al ser una aplicación **Local-First sin autenticación**, el flujo prioriza la **escritura inmediata (Zero-Friction)** al abrir el ejecutable.

## Reglas de Oro para cada Rama (Prompts en Antigravity)
Cada rama que toque datos debe completar estrictamente este ciclo antes de hacer merge a `main`:
1. **DB (`src/main/db/schema.ts`):** Definir/actualizar tablas en Drizzle ORM.
2. **Tipos (`src/shared/types.ts`):** Exportar interfaces compartidas entre Node y Vue.
3. **IPC (`src/main/ipc/` + `src/preload/`):** Crear el `ipcMain.handle` y exponerlo tipado en `window.api`.
4. **Estado (`src/renderer/src/stores/`):** Conectar Pinia con `window.api`.
5. **UI (`src/renderer/src/`):** Componentes con estética Glassmorphism / Liquid UI.

---

## Estructura de Ramas Planificadas

### 1. `feat/core-schema-and-cleanup` (Limpieza y Modelo de Datos Real)
**Objetivo:** Eliminar los componentes de prueba del scaffolding inicial (`Versions.vue`, tabla de test) y construir los cimientos de la base de datos para documentos/folios.
- **Base de Datos (Drizzle):**
  - Tabla `folios` (o `documents`): `id` (UUID/Text PK), `parentId` (nullable, para anidación infinita de subpáginas), `title` (Text), `content` (Text - JSON/Markdown), `icon` (Text), `isFavorite` (Integer/Boolean), `isArchived` (Integer/Boolean, papelera), `createdAt`, `updatedAt`.
- **IPC (`folioHandler.ts`):**
  - `folio:getAll` (obtener árbol de documentos activos).
  - `folio:getById` (cargar contenido de un documento).
  - `folio:create` (crear nuevo folio vacío o con plantilla).
  - `folio:update` (actualizar título, contenido o icono).
  - `folio:softDelete` / `folio:restore` (mover a papelera o restaurar).
- **Entregable:** Al abrir la app, si la base de datos está vacía, se crea automáticamente un primer documento de bienvenida y se carga en el store `useFolioStore`.

---

### 2. `feat/liquid-workspace-layout` (Shell de la App y Navegación)
**Objetivo:** Construir el contenedor visual definitivo con estética Glassmorphism y barra lateral colapsable para que la app se sienta como un entorno nativo fluido.
- **UI & Layout (`src/renderer`):**
  - Eliminar `DashboardView.vue` de prueba y crear `WorkspaceView.vue` como vista raíz única.
  - **Sidebar Líquido:** Panel lateral translúcido (`backdrop-blur-2xl`, `bg-slate-900/40`, `border-r border-white/10`) con animación de colapso suave.
  - **Árbol de Documentos:** Lista recursiva en el sidebar para navegar entre folios, marcar favoritos y botón rápido `+ Nuevo Folio`.
  - **Zero-Friction Boot:** Al iniciar la aplicación, debe abrir directamente el último folio editado (guardando el `lastOpenedFolioId` en `localStorage` o tabla `settings`) listo para escribir sin pantallas intermedias.

---

### 3. `feat/rich-editor-autosave` (Motor de Escritura y Autoguardado)
**Objetivo:** Integrar el editor de texto enriquecido por bloques con escritura instantánea y persistencia transparente en SQLite.
- **Dependencias:** `@tiptap/vue-3`, `@tiptap/starter-kit`, `@tiptap/extension-placeholder`, `@tiptap/extension-task-list`, `@tiptap/extension-task-item`.
- **Funcionalidades del Editor:**
  - Título grande editable en la cabecera del documento (sincronizado en tiempo real con el Sidebar).
  - Soporte nativo para Markdown al vuelo (`# `, `- `, `[] `, bloques de código).
  - Menú flotante (*Bubble Menu*) con efecto cristal al seleccionar texto (Negrita, Cursiva, Código, Resaltado).
- **Motor de Autoguardado (Debounce):**
  - Implementar guardado reactivo con `@vueuse/core` (`useDebounceFn` a 400ms). Mientras el usuario escribe, se actualiza el estado en memoria; al pausar 400ms, se dispara `window.api.updateFolio()` en segundo plano con un indicador sutil de estado (*"Guardado en local"*).

---

### 4. `feat/command-palette-and-search` (Búsqueda Instantánea FTS y Atajos)
**Objetivo:** Navegación ultrarrápida mediante teclado sin tocar el ratón.
- **Backend / SQLite:**
  - Implementar consulta IPC `folio:search` buscando coincidencias en `title` y `content` (con opción a índice FTS5 de SQLite para búsquedas instantáneas en miles de notas).
- **UI (Modal `Ctrl+K` / `Cmd+K`):**
  - Paleta de comandos flotante en el centro de la pantalla con desenfoque intenso.
  - Búsqueda en tiempo real de cualquier folio y acciones rápidas (*"Crear nuevo folio"*, *"Alternar barra lateral"*, *"Ir a la papelera"*).

---

### 5. `feat/organization-tags-and-trash` (Etiquetas, Favoritos y Papelera)
**Objetivo:** Gestión avanzada del ciclo de vida de los documentos.
- **Base de Datos:**
  - Tabla `tags` (`id`, `name`, `color`) y tabla pivote `folio_tags`.
- **UI:**
  - Selector de etiquetas con píldoras translúcidas de colores en la parte superior de cada folio.
  - Vista/Modal de **Papelera** donde ver los documentos con `isArchived = true`, permitiendo vaciar la papelera (`DELETE` físico en SQLite) o restaurarlos.

---

### 6. `feat/local-backups-and-export` (Soberanía del Dato: Exportación y Backups)
**Objetivo:** Garantizar que el usuario sea dueño absoluto de sus datos al no existir nube.
- **IPC Nativo (`dialog` y `fs` de Electron):**
  - **Exportar Folio:** Guardar el documento actual como archivo `.md` (Markdown) o `.pdf` en el disco duro.
  - **Backup Completo en 1 Clic:** Copiar el archivo `folio.db` activo a la carpeta que el usuario elija mediante el selector nativo del sistema operativo, y función para **Restaurar copia de seguridad** reemplazando la base de datos actual.
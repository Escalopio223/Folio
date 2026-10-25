# Folio ✦ Local-First Desktop Architecture

Aplicación de escritorio multiplataforma (Windows, Linux, macOS) diseñada bajo una arquitectura **Local-First**, unificando una interfaz reactiva moderna con persistencia embebida de alto rendimiento y estética **Glassmorphism / Liquid UI**.

---

## 🏛️ Arquitectura del Sistema

Folio prescinde de la arquitectura cliente-servidor HTTP tradicional (servidores Express o APIs REST locales) en favor de un modelo **Unificado de Procesos Nativos** sobre Electron.

```text
+-----------------------------------------------------------------------+
|                         Ejecutable Folio (.exe / .dmg / .AppImage)    |
|                                                                       |
|  +---------------------------+         +---------------------------+  |
|  |     Renderer Process      |         |       Main Process        |  |
|  |  (Vue 3 + Tailwind CSS)   |         |     (Node.js Nativo)      |  |
|  |                           |   IPC   |                           |  |
|  |  - Interfaz Liquid UI     | <=====> |  - Controladores IPC      |  |
|  |  - Estado en Pinia        |  Tipado |  - Drizzle ORM            |  |
|  |  - Componentes Headless   |         |  - Driver better-sqlite3  |  |
|  +---------------------------+         +-------------+-------------+  |
|                                                      |                |
+------------------------------------------------------|----------------+
                                                       | I/O Síncrono (WAL)
                                                       v
                                         +---------------------------+
                                         |   Almacenamiento Local    |
                                         |     (OS userData Dir)     |
                                         |         folio.db          |
                                         +---------------------------+
```

### Principios Clave:
1. **Zero HTTP Latency**: Todas las transacciones se resuelven mediante el bus IPC nativo de Electron (`contextBridge` + `ipcMain.handle`).
2. **Atomicidad ACID & Modo WAL**: SQLite opera con `journal_mode = WAL` (Write-Ahead Logging), garantizando escrituras ultrarrápidas y lecturas concurrentes sin bloqueos.
3. **Persistencia Dinámica según Entorno**:
   - **Desarrollo (`!app.isPackaged`)**: Archivo local `./dev.db` en la raíz del proyecto para facilitar inspecciones directas con SQLite Studio o Drizzle Kit.
   - **Producción (`app.isPackaged`)**: Archivo alojado en `path.join(app.getPath('userData'), 'folio.db')` respetando los estándares de almacenamiento de cada sistema operativo (AppData en Windows, Application Support en macOS, ~/.config en Linux).
4. **Seguridad y Tipado Estricto**: Conexión entre Main y Renderer 100% aislada (`contextIsolation: true`, `sandbox: false` para el preload).

---

## 📂 Estructura del Proyecto

```text
Folio/
├── electron-builder.yml        # Configuración de empaquetado (NSIS, AppImage, DMG)
├── electron.vite.config.ts     # Configuración de Vite con externalizeDepsPlugin y Tailwind
├── drizzle.config.ts           # Configuración de Drizzle Kit
├── src/
│   ├── main/                   # Proceso Principal (Backend Local)
│   │   ├── db/
│   │   │   ├── index.ts        # Inicialización de better-sqlite3, pragmas y Drizzle
│   │   │   └── schema.ts       # Definición de tablas y esquemas SQLite
│   │   ├── ipc/
│   │   │   ├── dbHandler.ts    # Controladores IPC para queries y mutations SQLite
│   │   │   ├── windowHandler.ts# Controladores IPC para ventana frameless
│   │   │   └── index.ts        # Registro modular de handlers
│   │   └── index.ts            # Punto de entrada de Electron (Ventana, Menú, Ciclo de vida)
│   │
│   ├── preload/                # Puente Seguro (Context Isolation)
│   │   ├── index.ts            # Exposición de métodos mediante contextBridge
│   │   └── index.d.ts          # Declaración de tipos globales (window.api)
│   │
│   ├── shared/                 # Tipos compartidos Main <-> Preload <-> Renderer
│   │   └── types.ts            # Interfaces DTO, DbStatus, Items, WindowAction
│   │
│   └── renderer/               # Proceso Renderer (Frontend Vue 3)
│       ├── index.html          # Shell HTML con CSP seguro
│       └── src/
│           ├── assets/
│           │   └── main.css    # Tailwind CSS v4 + Tokens de Glassmorphism
│           ├── components/
│           │   └── TitleBar.vue# Barra de título moderna personalizada (drag-region)
│           ├── stores/
│           │   └── dbStore.ts  # Store de Pinia para estado reactivo de SQLite
│           ├── views/
│           │   └── DashboardView.vue # Vista Glassmorphism con diagnósticos y test en vivo
│           ├── router/         # Vue Router con historial Hash
│           ├── App.vue         # Contenedor raíz con fondos ambientales difusos
│           └── main.ts         # Bootstrap de Vue 3
```

---

## ⚡ Canales IPC Implementados

| Canal | Método | Descripción | Retorno |
| :--- | :--- | :--- | :--- |
| `db:status` | `handle` | Retorna diagnóstico de SQLite, versión, modo WAL y ruta física | `DbStatus` |
| `db:items:get` | `handle` | Obtiene la lista completa de registros | `Item[]` |
| `db:items:create` | `handle` | Inserta un nuevo registro en caliente en SQLite | `Item` |
| `db:items:delete` | `handle` | Elimina un registro por ID | `boolean` |
| `window:action` | `handle` | Controla la ventana frameless (minimizar, maximizar, cerrar) | `boolean \| void` |

---

## 🚀 Comandos de Desarrollo y Compilación

### Iniciar en Desarrollo:
```bash
npm run dev
```

### Verificación de Tipos TypeScript:
```bash
npm run typecheck
```

### Compilar Proyecto con Electron-Vite:
```bash
npm run build
```

### Empaquetado Multiplataforma (electron-builder):
- **Windows (Instalador NSIS .exe)**:
  ```bash
  npm run build:win
  ```
- **Linux (AppImage / Deb)**:
  ```bash
  npm run build:linux
  ```
- **macOS (.dmg)**:
  ```bash
  npm run build:mac
  ```
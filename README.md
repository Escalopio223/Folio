# Folio ✦ Santuario Editorial Local-First para Escritores

<p align="center">
  <img src="resources/icon.png" alt="Folio Logo" width="108" height="108" />
</p>

<p align="center">
  <strong>Aplicación de escritorio multiplataforma (Windows, macOS, Linux) de alto rendimiento para novelistas y creadores de mundos.</strong><br>
  Diseñada bajo una arquitectura <em>Local-First</em> con persistencia embebida SQLite (WAL), editor enriquecido TipTap/ProseMirror, vinculación interactiva de Lore, gamificación y diseño táctil en Neumorfismo Cálido.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Electron-33.x-47848F?style=for-the-badge&logo=electron&logoColor=white" alt="Electron" />
  <img src="https://img.shields.io/badge/Vue.js-3.5-4FC08D?style=for-the-badge&logo=vuedotjs&logoColor=white" alt="Vue 3" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/SQLite-WAL%20Mode-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite" />
  <img src="https://img.shields.io/badge/Drizzle_ORM-0.36-C5F74F?style=for-the-badge&logo=drizzle&logoColor=black" alt="Drizzle ORM" />
  <img src="https://img.shields.io/badge/TipTap-ProseMirror-000000?style=for-the-badge&logo=markdown&logoColor=white" alt="TipTap" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/License-MIT-C85A32?style=for-the-badge" alt="License MIT" />
</p>

---

## 🏛️ Filosofía y Arquitectura Local-First

Folio rechaza deliberadamente el modelo SaaS tradicional dependiente de la nube, servidores lentos o suscripciones forzadas. La soberanía de los manuscritos pertenece exclusivamente al autor en su máquina local:

```text
+-----------------------------------------------------------------------------------------+
|                                  APLICACIÓN FOLIO (.exe / .dmg / .AppImage)             |
|                                                                                         |
|  +----------------------------------+            +-----------------------------------+  |
|  |       RENDERER PROCESS (UI)      |            |        MAIN PROCESS (Nativo)      |  |
|  |  Vue 3 · Pinia · Tailwind CSS    |            |   Node.js · IPC Handlers · FS     |  |
|  |                                  |    IPC     |                                   |  |
|  |  - Editor TipTap / ProseMirror   | <========> |  - Controladores Drizzle ORM      |  |
|  |  - Wiki de Lore & Hover Preview  |   Tipado   |  - Driver better-sqlite3          |  |
|  |  - Motor de Audio Procedural     |  Estricto  |  - Motor de Exportación PDF/Docx  |  |
|  |  - Sistema de Metas & Logros     |            |  - Gestor de Ventana Nativa       |  |
|  +----------------------------------+            +-----------------+-----------------+  |
|                                                                    |                    |
+--------------------------------------------------------------------|--------------------+
                                                                     | I/O Síncrono (WAL)
                                                                     v
                                                   +-----------------------------------+
                                                   |      PERSISTENCIA LOCAL ACID      |
                                                   |         (Directorio Seguro)       |
                                                   |              folio.db             |
                                                   +-----------------------------------+
```

### Principios Fundamentales de Ingeniería
1. **Cero Latencia de Red (Zero-Lag):** Todas las lecturas y escrituras se ejecutan mediante el bus IPC nativo de Electron (`contextBridge` + `ipcMain.handle`).
2. **Atomicidad ACID & Modo WAL:** SQLite opera con `journal_mode = WAL` (Write-Ahead Logging), permitiendo escrituras concurrentes instantáneas sin bloqueos de lectura.
3. **Aislamiento Seguro de Procesos:** Conexión entre Main y Renderer 100% aislada (`contextIsolation: true`), protegiendo el sistema de archivos del usuario.
4. **Resiliencia de Guardado (*Flush Save*):** Autoguardado debounced a 500ms con salvaguarda forzada instantánea en cambios de contexto, navegación y cierre de aplicación (`beforeunload`).

---

## ✨ Características Principales

### ✍️ 1. Motor de Escritura y Lienzo Editorial
- **Modo Máquina de Escribir (*Typewriter Scrolling*):** Inspirado en *Scrivener* y *Typora*. A partir del centro de la pantalla (50% vertical), la línea de escritura permanece anclada a la altura de los ojos, desplazando el texto suavemente conforme se teclea o se pulsa `Enter`.
- **Modo Zen Inmersivo (<kbd>F11</kbd> / <kbd>Esc</kbd>):** Oculta automáticamente barras laterales, menús y barras de estado. Proyecta un foco nítido (spotlight 100%) sobre el párrafo activo mientras atenúa con delicadeza el resto de la prosa, con acceso a los menús por proximidad del cursor (*Hover Reveal*).
- **Efectos Sonoros Mecánicos Procedurales:** Sintetizador de audio en tiempo real construido sobre la **Web Audio API** (chasquido de impacto, percusión hueca de barra espaciadora, retorno de carro y campanita clásica *ding!*). Cero archivos externos, 0ms de latencia y botón de silenciado en un clic.
- **Cortes de Escena (`* * *` Florón):** División de capítulos en tramos escénicos con navegación dinámica desde la barra lateral.
- **Buscador en Capítulo estilo VS Code (<kbd>Ctrl+F</kbd>):** Búsqueda en tiempo real con remarcado de coincidencias y navegación entre ocurrencias.
- **Corrector Ortográfico Multilingüe:** Integrado con el corrector nativo de Chromium con sincronización automática de atributos DOM `lang` en español e inglés.

### 📖 2. Organización del Manuscrito
- Árbol jerárquico de Capítulos y Escenas con estados editoriales táctiles (*Borrador*, *En curso*, *Finalizado*).
- Métricas dinámicas: conteo de palabras en vivo, caracteres y tiempo de lectura estimado.
- Papelera de reciclaje lógica con restauración o purgado definitivo.

### 🌍 3. Wiki de Lore & Worldbuilding Integrada
- Fichas enciclopédicas completas para **Personajes, Lugares, Objetos, Ideas y Reglas del Mundo**.
- **Atributos Dinámicos:** Sistema flexible de propiedades personalizadas clave-valor.
- **Detección Automática en Prosa & *Hover Previews*:** El editor detecta automáticamente los términos de la Wiki en el texto; pasar el cursor sobre cualquier nombre despliega un popover flotante con su biografía y acceso directo a su ficha.

### 🎯 4. Gamificación y Constancia
- **Ritual de Inicio:** Configuración de objetivo de palabras por sesión (mínimo de 500 palabras).
- **21 Logros Escalables:** Repartidos en 3 ramas de progreso (Volumen de Palabras, Estructura de Capítulos y Constancia) hasta culminar en el prestigioso **Trofeo Platino**.
- Registro histórico de sesiones y racha diaria de escritura.

### 🖨️ 5. Exportación Editorial Multiformato
- **PDF de Imprenta:** Maquetación con saltos de página limpios, encabezados decorativos, numeración y tipografías ajustadas al estándar literario.
- **DOCX (Word) & Markdown:** Exportación limpia compatible con cualquier procesador de textos o editor de texto plano.
- **Copias de Seguridad Físicas:** Generación de copias completas de la base de datos `.db` y archivos comprimidos.

### 🎨 6. Diseño Táctil Neumórfico Cálido
- Estética suave con biseles realistas y paleta dual: **Papel Claro** (`#EFEAE1` con acento terracota `#C85A32`) y **Modo Espresso Oscuro** (`#120E0B`).
- Personalizador de color en vivo con modulación de 3 tonos base y derivaciones tonales automáticas (vía `color-mix` OKLab).

---

## ⌨️ Atajos de Teclado Principales

| Atajo | Función | Ámbito |
| :--- | :--- | :--- |
| <kbd>F11</kbd> / <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd> | Alternar **Modo Zen Inmersivo** (Pantalla limpia & foco) | Editor / Global |
| <kbd>Esc</kbd> | Salir del Modo Zen / Cerrar modal activo | Global |
| <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>T</kbd> | Alternar **Modo Máquina de Escribir** (Centrado 50%) | Editor |
| <kbd>Ctrl</kbd>+<kbd>S</kbd> | Forzar guardado inmediato en SQLite | Editor |
| <kbd>Ctrl</kbd>+<kbd>F</kbd> | Abrir buscador dentro del capítulo activo | Editor |
| <kbd>Ctrl</kbd>+<kbd>K</kbd> | Paleta de comandos y búsqueda global omnibox | Global |
| <kbd>Ctrl</kbd>+<kbd>J</kbd> | Abrir / cerrar cajón de notas rápidas (*Scratchpad*) | Global |
| <kbd>Ctrl</kbd>+<kbd>B</kbd> | Alternar barra lateral del manuscrito | Global |
| <kbd>F1</kbd> | Abrir Guía y Manual de Usuario | Global |

---

## 📂 Estructura del Código Fuente

```text
Folio/
├── electron-builder.yml        # Configuración de empaquetado nativo (NSIS, Portable, DMG, AppImage)
├── electron.vite.config.ts     # Configuración de compilación con Vite + Tailwind
├── drizzle.config.ts           # Configuración de migraciones Drizzle Kit
├── src/
│   ├── main/                   # PROCESO MAIN (Node.js & SQLite)
│   │   ├── db/
│   │   │   ├── index.ts        # Inicialización de better-sqlite3 y pragmas WAL
│   │   │   └── schema.ts       # Esquema relacional Drizzle (proyectos, folios, lore, metas, notas)
│   │   ├── ipc/                # Controladores IPC seguros (CRUD, Ventana, Exportación, Spellcheck)
│   │   └── index.ts            # Ciclo de vida y creación de ventana BrowserWindow
│   │
│   ├── preload/                # PUENTE DE COMUNICACIÓN (Context Isolation)
│   │   ├── index.ts            # Exposición de APIs mediante contextBridge
│   │   └── index.d.ts          # Declaración tipada de window.api
│   │
│   ├── shared/                 # Tipos compartidos e interfaces DTO
│   │   └── types.ts            # FolioApi, Folio, LoreItem, Project, WindowAction
│   │
│   └── renderer/               # PROCESO RENDERER (Frontend Vue 3)
│       └── src/
│           ├── assets/         # main.css (Tailwind CSS v4 + Tokens de Neumorfismo Cálido)
│           ├── components/
│           │   ├── editor/     # TiptapEditor.vue y extensiones personalizadas (Typewriter, Focus, SceneBreak)
│           │   ├── goals/      # Metas de sesión, rituales y catálogo de logros
│           │   ├── palette/    # Paleta de comandos omnibox (Ctrl+K)
│           │   ├── scratchpad/ # Cajón lateral de notas rápidas
│           │   ├── trash/      # Papelera de reciclaje y purgado
│           │   └── TitleBar.vue# Barra de título táctil frameless
│           ├── composables/    # useTypewriterAudio, useSpellcheck, useChapterMetrics
│           ├── stores/         # Pinia (folioStore, projectStore, loreStore, goalsStore, uiStore)
│           └── views/
│               └── DashboardView.vue # Espacio de trabajo editorial
```

---

## 📥 Descarga e Instalación (Para Usuarios Finales)

> [!TIP]
> **¡No necesitas instalar Node.js, Git ni usar ninguna consola!**  
> El instalador de Folio es **100% autónomo y autocontenido (*Standalone*)**: incluye su propio motor de ejecución embebido y base de datos SQLite lista para usar.

1. Entra en la sección oficial de [**GitHub Releases**](https://github.com/Escalopio223/Folio/releases/latest).
2. Descarga el archivo **`folio-1.0.0-setup.exe`**.
3. Haz doble clic en el instalador, sigue los sencillos pasos del asistente y la aplicación se abrirá en tu escritorio lista para redactar.

---

## 🛠️ Desarrollo y Compilación desde el Código Fuente (Solo Desarrolladores)

Si eres desarrollador y deseas clonar el repositorio para inspeccionar el código, compilarlo por ti mismo o contribuir:

### Requisitos previos para compilar
- **Node.js** >= 18.x
- **npm** o **pnpm**
- Herramientas de compilación C++ para el driver nativo de SQLite (`better-sqlite3`):
  - **Windows:** Visual Studio C++ Build Tools.
  - **macOS:** Xcode Command Line Tools (`xcode-select --install`).
  - **Linux:** `sudo apt install build-essential`.

### Pasos de compilación

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/Escalopio223/Folio.git
   cd Folio
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Iniciar en entorno de desarrollo:**
   ```bash
   npm run dev
   ```

4. **Verificación estricta de tipos:**
   ```bash
   npm run typecheck
   ```

5. **Generar tu propio instalador (.exe):**
   ```bash
   npm run build:win
   ```
   El instalador se generará automáticamente en la carpeta `dist/`.

```bash
# Compilar TypeScript y empaquetar instalador NSIS (.exe)
npm run build:win
```

Los instaladores resultantes se generarán en la carpeta `dist/`:
- `Folio Setup x.x.x.exe` (Instalador con asistente de instalación).

---

## 📄 Licencia

Este proyecto está bajo la Licencia **MIT**. Consulta el archivo [LICENSE](LICENSE) para más detalles.

# Funcionalidades de Folio (Santuario Editorial)

Documento conciso de todas las funcionalidades implementadas y operativas en la aplicación actual.

---

## 1. Gestión de Proyectos / Libros
- **Gestión Multi-Libro:** Creación, selección y almacenamiento de múltiples obras o novelas independientes.
- **Selector Desplegable Táctil (`BookSelector`):** Menú neumórfico para alternar entre libros al instante con indicador visual del libro activo.
- **Alta de Nuevas Obras (`ProjectModal`):** Modal para crear proyectos indicando título, género literario y sinopsis/premisa.
- **Inicialización Automática:** Al crear un libro nuevo se crea automáticamente un "Capítulo I" para escribir de inmediato sin fricción.
- **Eliminación Segura de Libros:** Modal de confirmación neumórfica para eliminar obras con borrado en cascada (elimina sus capítulos, escenas y entradas de wiki correspondientes).
- **Persistencia de Selección:** Recuerda en almacenamiento local el último libro activo entre sesiones.

---

## 2. Estructura de Manuscrito (Capítulos y Escenas)
- **Organización Jerárquica:** Estructura en dos niveles con Capítulos (raíces) y Escenas subordinadas (anidadas por `parentId`).
- **Navegación en Acordeón:** Plegado y desplegado interactivo de capítulos con preservación de estado.
- **Creación Dinámica:** Botones dedicados para añadir nuevos capítulos o agregar escenas dentro de un capítulo específico.
- **Estados Editoriales:** Marcado de estado para cada escena con selector táctil:
  - *Borrador* (ámbar).
  - *En curso* (azul cielo).
  - *Finalizado* (verde esmeralda).
- **Borrado Suave a Papelera:** Eliminación suave de escenas mediante archivado lógico (`isArchived = true`) desde el árbol lateral o cabecera.
- **Visualización Activa:** Resaltado de capítulo o escena en edición con estilo neumórfico hundido (*neu-well*) y borde terracota.

---

## 3. Librería de Datos / Wiki de Lore (Worldbuilding)
- **Conmutador de Modos:** Alternancia en barra lateral entre el *Manuscrito* y la *Librería / Wiki* en 1 clic.
- **Categorías Dinámicas:** Categorías estándar (*personaje*, *lugar*, *objeto*, *idea*, *pensamiento*) y creación libre de categorías personalizadas directas desde la ficha.
- **Filtrado Rápido:** Barra horizontal de categorías para filtrar las entradas del codex al instante (con contador de elementos).
- **Ficha Enciclopédica Completa:**
  - Nombre o título de la entidad.
  - Categoría asignada (editable en vivo).
  - Resumen breve en una sola línea.
  - Campo amplio para historia, biografía, psicología o notas extensas.
- **Gestor de Atributos Clave-Valor:** Añadido y eliminación de propiedades dinámicas en formato chip (ej. `Rol: Protagonista`, `Edad: 28`, `Rareza: Única`).
- **Archivado a Papelera:** Eliminación suave de entradas de la wiki conservando integridad en SQLite.

---

## 4. Lienzo Editorial y Escritura
- **Diseño Centrado en Columna Dorada:** Área de texto optimizada para lectura y foco (`max-w-3xl`) con tipografía narrativa serif (`font-editorial`).
- **Edición Rápida de Metadatos:** Campos integrados en el propio lienzo para título de la escena/capítulo y nota de sinopsis.
- **Indentación de Prosa:** Soporte nativo para la tecla `Tab` en el área de texto (inserta 2 espacios sin perder el foco ni seleccionar elementos externos).
- **Contador de Palabras de Sesión en Vivo:** Registro reactivo en tiempo real `+Y sesión` (con icono sutil y color terracota `#C85A32`) que calcula el incremento neto de palabras redactadas desde el inicio de la jornada o sesión a través de todos los folios editados.
- **Modo Máquina de Escribir (Typewriter Scrolling):** Conmutador táctil neumórfico (`Ctrl+Shift+T`). Bloquea el cursor **permanentemente en el centro vertical exacto de la pantalla (50vh)** como una auténtica máquina de escribir: es el papel/texto el que se desplaza hacia arriba conforme redactas, pulsas Enter o navegas con flechas, manteniendo siempre la línea activa fija en el centro de tu mirada sin importar si estás en la línea 1 o al final del libro.
- **Modo Enfoque en Párrafo (Focus Mode):** Conmutador de inmersión visual (`Ctrl+Shift+F`) que transforma el entorno en un santuario libre de distracciones: atenúa la cabecera, notas y métricas al 25% de opacidad (recuperables al pasar el ratón), y proyecta un **spotlight translúcido sobre el párrafo activo** (100% de contraste nítido) mientras suaviza con un velo armónico todos los párrafos anteriores y posteriores al 18% de contraste, manteniendo la selección y edición de texto 100% nativa.
- **Métricas en Tiempo Real:**
  - Contador de palabras totales.
  - Palabras netas añadidas en la sesión activa (`+Y sesión`).
  - Contador de caracteres.
  - Tiempo estimado de lectura calculado automáticamente (`~X min de lectura`).
  - Tipo de documento activo (Capítulo o Escena).
- **Scrollbar Editorial Delgado:** Barra de desplazamiento estilizada y sutil adaptada a la paleta neumórfica.

---

## 5. Sistema de Autoguardado y Seguridad Anti-Pérdida
- **Reactividad Instantánea en Memoria (Zero-Lag):** Los cambios de título, estado y contenido se reflejan al instante en la interfaz y en el menú lateral sin retrasos.
- **Autoguardado Inteligente (Debounce 500ms):** Persistencia automática en SQLite tras 500 ms de inactividad de escritura.
- **Salvaguarda Forzada (*Flush Save*):** Guardado inmediato y sincronizado al cambiar entre escenas, capítulos, entradas de wiki, cambio de libro o al cerrar/recargar la ventana (`beforeunload`).
- **Guardado Manual Inmediato:** Forzado de persistencia en cualquier momento mediante atajo `Ctrl+S` / `Cmd+S` o botón en barra de herramientas.
- **Indicador de Estado Reactivo:** Notificación visual con punto led interactivo en barra superior:
  - *Guardado local* (con timestamp de la última grabación).
  - *Sin guardar...* (cambios pendientes en cola).
  - *Guardando...* (con animación de pulso).
  - *Error en SQLite*.

---

## 6. Interfaz y Experiencia Táctil (Warm Neumorphism)
- **Neumorfismo Cálido Táctil:** Interfaz personalizada con relieves realistas, hendiduras hundidas, ranuras 3D (`neu-groove`) y paleta terracota oficial (`#C85A32`).
- **Modo Dual (Claro / Oscuro):**
  - *Modo Papel Cálido* (por defecto): Tonos pergamino y marfil (`#F7F4EF`, `#EFEAE1`).
  - *Modo Espresso Oscuro*: Fondo café tostado profundo (`#120E0B`, `#1C1612`).
  - Alternador de tema en barra de título con persistencia en `localStorage`.
- **Barra Lateral Colapsable:**
  - Menú retráctil con animación fluida para maximizar el área de escritura sin distracciones.
  - Ocultable y desplegable de forma limpia desde el botón de la barra de título o mediante el atajo global `Ctrl+B` (sin botones flotantes superpuestos redundantes en el lienzo).
- **Barra de Título Frameless Personalizada:** Barra superior arrastrable (*drag-region*) con logotipo oficial de Folio, insignia `LOCAL` y botones nativos para minimizar, maximizar/restaurar y cerrar.
- **Pantalla de Carga (*AppSplash*):** Pantalla de bienvenida táctil con emblema pulsante y barra de progreso al inicializar el entorno.
- **Estados Vacíos (*Empty States*):** Pantallas ilustradas con accesos directos cuando no hay capítulos o entradas seleccionadas.

---

## 7. Arquitectura Local-First y Almacenamiento
- **Persistencia SQLite Embebida:** Base de datos nativa con driver `better-sqlite3` y `Drizzle ORM`.
- **Modo WAL y Foreign Keys:** Rendimiento transaccional ultra-rápido (`journal_mode = WAL`) e integridad referencial activa (`ON DELETE CASCADE`).
- **Aislamiento por Entorno:**
  - Desarrollo: `./dev.db` en la raíz del proyecto.
  - Producción: Base de datos en directorio de datos del usuario (`userData/folio.db`).
- **Semillado Inicial (Seeding):** Si la base de datos está vacía, genera automáticamente el libro de ejemplo *"El Archivo de las Sombras"* con capítulos, escenas y fichas de lore.
- **IPC Tipado Modular:** Comunicación segura y desacoplada mediante `contextBridge` (`window.api.project`, `window.api.folio`, `window.api.lore`, `window.api.window`).

---

## 8. Atajos de Teclado Operativos
| Atajo | Acción |
| :--- | :--- |
| `Ctrl+S` / `Cmd+S` | Guardado forzado instantáneo en base de datos SQLite |
| `Ctrl+N` / `Cmd+N` | Creación rápida de nueva escena o capítulo y foco en su título |
| `Ctrl+B` / `Cmd+B` | Colapsar o expandir la barra lateral de navegación |
| `Ctrl+Shift+T` / `Cmd+Shift+T` | Alternar Modo Máquina de Escribir (centrado ergonómico a la altura de los ojos sin vibración) |
| `Ctrl+Shift+F` / `Cmd+Shift+F` | Alternar Modo Enfoque (viñeta de iluminación activa en torno al cursor) |
| `Tab` | Indentar texto (2 espacios) dentro del editor de prosa sin desenfocar |
| `Esc` | Cerrar desplegables y selectores abiertos |

# Auditoría y Diagnóstico de UX/UI: Módulo de Reglas del Mundo (World Rules)

> **Fecha:** 27 de Octubre de 2026  
> **Rama:** `feature/world-rules`  
> **Objetivo:** Radiografía técnica y funcional completa del módulo actual, análisis crítico de por qué la experiencia de uso (UX) y el diseño visual (UI) resultan frustrantes/sobrecargados, y matriz de propuestas concretas para decidir qué mantener, qué simplificar y qué rediseñar.

---

## 1. Diagnóstico Ejecutivo: ¿Por qué la experiencia actual resulta "horrible"?

La implementación técnica cumple los requisitos funcionales del roadmap, pero su traslación a la pantalla sufre de un problema clásico de diseño: **"Síndrome del Panel Sobrecargado" (efecto caja de zapatos)** y **"Burocracia de Formulario"**.

### Los 5 dolores principales detectados:
1. **Espacio Asfixiado (Sidebar de 300px):** Queremos meter en una columna lateral estrecha un buscador, botón de acción, carrusel horizontal de categorías, banner de sugerencias de género, lista de reglas ancladas, lista general, tarjetas con bordes dobles, relieves interiores (`neu-well`), bloques de advertencia terracota y acordeones desplegables. El usuario no puede respirar.
2. **Formulario Tipo Declaración de la Renta:** Para apuntar una regla rápida mientras se redacta (*ej: "La telepatía requiere contacto visual"*), el escritor debe rellenar un modal con 5 campos: Categoría, Título, Axioma, Limitaciones y Detalles. Divide la mente del escritor en lugar de servirle de libreta ágil.
3. **Fricción de Pestañas ("Entidades" vs "Reglas"):** Ocultar completamente la Wiki de personajes/lugares para ver las reglas obliga a un constante "ping-pong" de clics si estás escribiendo un diálogo entre dos personajes donde aplica una ley mágica o social.
4. **Ruido Visual y Neumorfismo Pesado:** Cada tarjeta de regla tiene: badge superior, título, 3 botones en fila (pin, editar, borrar), una caja hundida en cursiva para el axioma, una caja terracota con icono de alerta para las limitaciones y un desplegable para los detalles. Si hay 4 reglas, el lateral parece una consola de mandos de una nave espacial en vez de una herramienta literaria elegante y cálida.
5. **Scroll Horizontal Clunky:** Las píldoras de categorías con scroll horizontal en un panel lateral de escritorio son incómodas de usar con ratón convencional (requieren `Shift + Rueda` o arrastrar con precisión).

---

## 2. Inventario Completo de lo que Existe Actualmente

### A. Capa de Datos y Persistencia (SQLite / Drizzle)
- **Tabla `world_rules` en [schema.ts](file:///c:/Users/arsin/Desktop/Proyectos/Folio/src/main/db/schema.ts):**
  - `id`: Entero autoincremental primario.
  - `projectId`: Clave foránea a `projects.id` con `ON DELETE CASCADE`.
  - `category`: Texto libre (ej. *"Sistemas de Magia"*, *"Protocolos Forenses"*).
  - `title`: Título de la regla o ley.
  - `axiom`: Declaración corta / verdad fundamental en 1-2 frases.
  - `details`: Texto largo / Markdown para notas profundas, excepciones o precedentes.
  - `limitations`: Costes, consecuencias punitivas, tabúes o qué ocurre al transgredir la regla.
  - `orderIndex`: Entero para orden manual/visual.
  - `isPinned`: Booleano para fijar reglas críticas arriba.
  - `createdAt` / `updatedAt`: Marcas de tiempo de creación y edición.
- **Acceso en Base de Datos ([src/main/db/index.ts](file:///c:/Users/arsin/Desktop/Proyectos/Folio/src/main/db/index.ts)):**
  - `getWorldRules(projectId)`: Consulta con orden `isPinned DESC, category ASC, orderIndex ASC`.
  - `saveWorldRule(rule)`: `INSERT` o `UPDATE` reactivo.
  - `deleteWorldRule(id)`: Borrado físico directo.
  - `reorderWorldRules(ids)`: Transacción SQLite síncrona en bloque.

### B. Capa IPC y Preload
- **Handlers Main ([rulesHandler.ts](file:///c:/Users/arsin/Desktop/Proyectos/Folio/src/main/ipc/rulesHandler.ts)):**
  - Canales: `rules:list`, `rules:save`, `rules:delete`, `rules:reorder`.
- **Preload ([preload/index.ts](file:///c:/Users/arsin/Desktop/Proyectos/Folio/src/preload/index.ts)):**
  - Expone `window.api.rules` tipado rigurosamente mediante `FolioApi`.

### C. Estado en Pinia ([rulesStore.ts](file:///c:/Users/arsin/Desktop/Proyectos/Folio/src/renderer/src/stores/rulesStore.ts))
- **Estado:**
  - `rules`: Array con todas las reglas del proyecto.
  - `selectedRuleId`: Regla actualmente seleccionada.
  - `activeCategoryFilter`: Filtro de categoría activa (`null` = todas).
  - `searchQuery`: Texto de búsqueda en vivo.
  - `isModalOpen` y `editingRule`: Control del formulario modal.
- **Getters:**
  - `categories`: Lista calculada y sin duplicados de las categorías presentes en el proyecto.
  - `rulesByCategory`: Reglas agrupadas por categoría.
  - `pinnedRules`: Reglas con `isPinned = true`.
  - `filteredRules`: Reglas que coinciden con búsqueda (en título, axioma o limitaciones) y categoría activa.

### D. Presets por Género ([rulePresets.ts](file:///c:/Users/arsin/Desktop/Proyectos/Folio/src/renderer/src/utils/rulePresets.ts))
- Banco de sugerencias según el campo `genre` del proyecto:
  - Fantasía / Sci-Fi.
  - Histórica / Épica.
  - Thriller / Policial / Judicial.
  - Misterio / Terror.
  - General / Ficción Contemporánea.
- Proporciona categorías y plantillas de ejemplo con axiomas y limitaciones sugeridas.

### E. Componentes de UI y Flujo Visual
1. **Tabs en Inspector Lateral ([WikiInspector.vue](file:///c:/Users/arsin/Desktop/Proyectos/Folio/src/renderer/src/components/WikiInspector.vue)):**
   - Segmented tab arriba: Botón "Entidades" (icono `Compass`) vs "Reglas" (icono `Scale`).
   - Conmuta entre la lista de Lore existente y la vista de Reglas.
2. **Contenedor Principal de Reglas ([WorldRulesList.vue](file:///c:/Users/arsin/Desktop/Proyectos/Folio/src/renderer/src/components/rules/WorldRulesList.vue)):**
   - Barra superior con caja de búsqueda (`<Search />`) + botón `+ Nueva Regla`.
   - Fila de chips de categorías con scroll horizontal (`Todas`, `Magia`, `Leyes`...).
   - Banner de sugerencias si hay pocas categorías (`<Lightbulb />`).
   - Sección de "Reglas Prioritarias / Ancladas" con divisor visual.
   - Lista vertical de tarjetas `RuleCard`.
3. **Tarjeta de Regla ([RuleCard.vue](file:///c:/Users/arsin/Desktop/Proyectos/Folio/src/renderer/src/components/rules/RuleCard.vue)):**
   - Header con Badge de Categoría + Título + Botones `[Pin]`, `[Editar]`, `[Borrar]`.
   - Caja `Axioma`: Contenedor hundido `neu-well`, tipografía serif en cursiva.
   - Caja `Limitaciones`: Contenedor con borde y acento terracota `#C85A32` con icono `AlertTriangle`.
   - Botón inferior con chevron para desplegar `Detalles` (acordeón).
4. **Modal de Redacción ([RuleEditModal.vue](file:///c:/Users/arsin/Desktop/Proyectos/Folio/src/renderer/src/components/rules/RuleEditModal.vue)):**
   - Modal centrado sobre fondo oscuro.
   - Input de Categoría + chips de clic rápido para autocompletar.
   - Input de Título.
   - Textarea de Axioma.
   - Textarea de Limitaciones / Costes.
   - Textarea de Detalles / Notas.
   - Checkbox "Fijar como regla prioritaria".
   - Atajos de teclado: `Ctrl+Enter` para guardar, `Esc` para salir.
5. **Paleta de Comandos `Ctrl+K` ([commandsRegistry.ts](file:///c:/Users/arsin/Desktop/Proyectos/Folio/src/renderer/src/components/palette/commandsRegistry.ts) y [CommandPaletteModal.vue](file:///c:/Users/arsin/Desktop/Proyectos/Folio/src/renderer/src/components/palette/CommandPaletteModal.vue)):**
   - Comandos ejecutables: *"Nueva Regla del Mundo"*, *"Ver Reglas del Mundo"*.
   - Resultados de búsqueda en vivo con badge `Regla` o `Ley`.

---

## 3. Matriz Crítica: ¿Qué Dejar, Qué Cambiar y Qué Eliminar?

| Elemento / Característica | Estado Actual | Veredicto | Diagnóstico y Recomendación |
| :--- | :--- | :---: | :--- |
| **Tabla SQLite y Persistencia** | `world_rules` con campos separados | **MANTENER / LIGERO AJUSTE** | El backend, IPC y persistencia funcionan de forma sólida, rápida y limpia. No hay que tocar la base de datos salvo simplificar cómo los componentes consumen los campos si decidimos unificarlos. |
| **Canales IPC y Store Pinia** | CRUD completo y reactivo | **MANTENER** | La lógica de getters, reactividad y mutaciones está bien estructurada y testeada. |
| **Paleta Ctrl+K** | Comandos y búsqueda indexada | **MANTENER** | Es extremadamente útil pulsar `Ctrl+K`, escribir *"Tercera Ley"* y encontrarla al instante. |
| **Segmented Tab "Entidades" vs "Reglas"** | Ocupa toda la cabecera lateral | **CAMBIAR RADICALMENTE** | Rompe la continuidad del espacio. El escritor no quiere elegir entre ver a su personaje o ver la regla mágica. Opciones: unificar en una sola lista con filtro de tipo (como una Wiki real), o mover las reglas a un panel/cajón deslizante propio. |
| **Separación Axioma / Limitación / Detalles** | 3 campos de texto distintos en el formulario | **SIMPLIFICAR DRÁSTICAMENTE** | Es burocrático y confuso. Un escritor quiere: **Título**, la **Regla central** (lo que no se puede hacer o cómo funciona) y unas **Notas opcionales**. El modal actual pide demasiadas cosas y desanima a escribir. |
| **Modal de Edición Pantalla Completa** | Modal flotante oscuro con 5 inputs | **ELIMINAR / REDISEÑAR A INLINE O SLIDE-OVER** | Abrir un modal invasivo mientras escribes interrumpe el flujo. Sería infinitamente mejor crear la regla *inline* (directamente en la lista) o en un panel lateral de edición rápida. |
| **Tarjeta Neumórfica Actual (`RuleCard`)** | 3 bloques apilados (Axioma + Limitaciones + Detalles) | **REDISEÑAR A MODO ULTRACOMPACTO** | La tarjeta actual mide más de 200px de alto. Con 3 reglas llenas la pantalla. Debería ser una tarjeta compacta tipo "Ficha de Glosario" de 45-60px con vista previa, expandible o abrible en vista detalle. |
| **Chips con Scroll Horizontal** | Barra de píldoras estrecha | **CAMBIAR** | Reemplazar por un selector dropdown limpio o un menú de píldoras auto-envolventes (*flex-wrap*), o una barra lateral limpia de dominios. |
| **Banner de Sugerencias de Género** | Caja con bombilla `<Lightbulb />` fija en la lista | **ELIMINAR DE LA LISTA PRINCIPAL** | Quita espacio útil continuamente. Las sugerencias solo deben aparecer cuando la lista esté vacía (Empty State) o dentro del selector de categorías del creador de reglas. |

---

## 4. Opciones de Rediseño de UX/UI para Valorar

### Opción A: "Fichas de Ley Compactas" (Minimalismo en el Sidebar)
- **Concepto:** Mantener las reglas en la columna derecha, pero reducir la tarjeta a una fila minimalista de 40px:
  - `[Icono Dominio] [Título de la Ley] [Badge Categoría] [Pin]`
  - Al hacer clic, no se expande dentro de la tarjeta rompiendo el scroll, sino que abre un visor/editor lateral limpio o un popover flotante al lado de tu texto.
  - La tarjeta colapsada solo muestra el título y el axioma en 1 línea con elipsis (`truncate`).
  - **Ventaja:** Puedes ver 10-12 reglas a golpe de vista en vez de 1.5.

### Opción B: Unificación en la Wiki de Lore ("Todo es Conocimiento")
- **Concepto:** ¿Por qué separar artificialmente "Entidades" de "Reglas"? En una novela de fantasía, la regla *"Coste del Éter"* es una ficha de lore tanto como el personaje *"Mago Arcano"*.
  - En la Wiki actual ya existen categorías o tipos (Personaje, Lugar, Facción, Objeto).
  - Añadir el tipo **"Regla / Ley / Axioma"** o **"Sistema del Mundo"** directamente en la Wiki.
  - Al crear una ficha de tipo "Regla", la ficha muestra una plantilla estilizada con su axioma y limitaciones.
  - **Ventaja:** Elimina pestañas redundantes, unifica búsqueda y filtros en un solo lugar.

### Opción C: Drawer / Cajón Rápido tipo "Compendio de Leyes" (como el Scratchpad)
- **Concepto:** El lateral derecho se reserva para notas de escena y fichas activas. Las Reglas del Mundo se convierten en una "Biblia de Ambientación" rápida:
  - Se abre con atajo de teclado rápido (ej. `Ctrl+L` de Leyes o botón en barra superior).
  - Se abre un drawer o split-sheet amplio donde puedes leer tus leyes organizadas por dominios en columnas limpias (como un códice o biblia de la serie).
  - **Ventaja:** No compite con el inspector lateral y permite una lectura espaciosa de sistemas complejos.

---

## 5. Resumen de Decisiones Pendientes (Para tu feedback)

Para proceder a la siguiente iteración y dejarlo a tu gusto exacto, necesitamos definir:

1. **¿Dónde quieres consultar las reglas?**
   - ¿Prefieres mantenerlas en la columna derecha (pero rediseñadas para que sean ultra-compactas y limpias)?
   - ¿O prefieres unificarlas con la Wiki de Lore en una sola lista homogénea?
   - ¿O prefieres un panel amplio accesible rápidamente (estilo cajón / modal grande tipo códice)?
2. **¿Cómo debe ser la tarjeta de regla?**
   - ¿Una lista compacta de una sola línea que se expande bajo demanda?
   - ¿O una ficha tipo post-it / index card con diseño editorial serif?
3. **¿Qué campos quieres realmente al apuntar una regla?**
   - ¿Nos quedamos solo con **Título**, **Regla / Axioma** y **Notas** (eliminando la distinción artificial de "limitaciones")?
   - ¿O te resulta útil el campo de "Limitaciones/Costes" pero con una UI mucho menos agresiva?

---

*Documento generado y disponible en la raíz del proyecto para tu revisión y debate: [WORLD_RULES_AUDIT.md](file:///c:/Users/arsin/Desktop/Proyectos/Folio/WORLD_RULES_AUDIT.md).*

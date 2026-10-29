# Radiografía Técnica y Auditoría de Consistencia: Sistema de Metas y Logros

> **Fecha:** 28 de Octubre de 2026  
> **Alcance:** Arquitectura de datos, lógica de negocio, catálogo de logros, flujos de actualización, cálculo de progreso/rachas y auditoría de consistencia (excluyendo diseño visual/UX/UI, que ya se encuentra validado).

---

## 1. Arquitectura General del Sistema

El sistema de gamificación y seguimiento editorial de **Folio** está diseñado con aislamiento **por proyecto (libro)**. Cada obra literaria tiene sus propias metas, su propio registro diario de escritura y su propia vitrina de logros desbloqueados.

### Mapa de Archivos Involucrados
- **Esquema SQLite (Drizzle ORM):** [`src/main/db/schema.ts`](file:///c:/Users/arsin/Desktop/Proyectos/Folio/src/main/db/schema.ts#L117-L169)
- **Motor de Base de Datos y Cálculos Backend:** [`src/main/db/index.ts`](file:///c:/Users/arsin/Desktop/Proyectos/Folio/src/main/db/index.ts#L1010-L1286)
- **Puente IPC (Main Process):** [`src/main/ipc/goalsHandler.ts`](file:///c:/Users/arsin/Desktop/Proyectos/Folio/src/main/ipc/goalsHandler.ts)
- **Catálogo y Reglas de Evaluación de Logros:** [`src/renderer/src/utils/achievementsCatalog.ts`](file:///c:/Users/arsin/Desktop/Proyectos/Folio/src/renderer/src/utils/achievementsCatalog.ts)
- **Store Reactivo de Metas y Toasts (Pinia):** [`src/renderer/src/stores/goalsStore.ts`](file:///c:/Users/arsin/Desktop/Proyectos/Folio/src/renderer/src/stores/goalsStore.ts)
- **Disparadores en Manuscrito y Editor:**
  - [`src/renderer/src/views/DashboardView.vue`](file:///c:/Users/arsin/Desktop/Proyectos/Folio/src/renderer/src/views/DashboardView.vue#L186-L238) (conteo y guardado de palabras)
  - [`src/renderer/src/stores/folioStore.ts`](file:///c:/Users/arsin/Desktop/Proyectos/Folio/src/renderer/src/stores/folioStore.ts#L114-L204) (creación de capítulos/escenas y cambio de estado)
- **Componentes Consumidores:**
  - [`GoalsAndAchievementsModal.vue`](file:///c:/Users/arsin/Desktop/Proyectos/Folio/src/renderer/src/components/goals/GoalsAndAchievementsModal.vue)
  - [`GoalsProgressPill.vue`](file:///c:/Users/arsin/Desktop/Proyectos/Folio/src/renderer/src/components/goals/GoalsProgressPill.vue)
  - [`AchievementToast.vue`](file:///c:/Users/arsin/Desktop/Proyectos/Folio/src/renderer/src/components/goals/AchievementToast.vue)

---

## 2. Modelo de Datos y Persistencia (SQLite)

Existen **3 tablas** en SQLite dedicadas a este sistema, todas con clave foránea a `projects.id` y borrado en cascada (`ON DELETE CASCADE`):

### 2.1. `project_goals` (Configuración de Expectativas del Libro)
Almacena 1 fila única por proyecto (`project_id` es `PRIMARY KEY`). Si un proyecto aún no tiene fila cuando se consulta [`getProjectGoals(projectId)`](file:///c:/Users/arsin/Desktop/Proyectos/Folio/src/main/db/index.ts#L1021-L1049), se autogenera con estos valores por defecto:
- `target_total_words`: `50000` (Meta global de palabras de la obra).
- `daily_word_goal`: `500` (Meta diaria de palabras).
- `daily_scene_goal`: `1` (Meta diaria de escenas).
- `daily_chapter_goal`: `0` (Meta diaria de capítulos — *actualmente en desuso en la UI*).
- `deadline_date`: `null` (Fecha límite en texto `YYYY-MM-DD` o `null`).
- `updated_at`: Timestamp de última modificación.

### 2.2. `daily_writing_logs` (Historial Diario de Productividad)
Registra la actividad de cada día natural por proyecto, con restricción `UNIQUE(project_id, date)`:
- `id`: Autoincremental.
- `project_id`: ID del libro.
- `date`: Fecha local en formato `YYYY-MM-DD` (generada por [`getLocalDateStr()`](file:///c:/Users/arsin/Desktop/Proyectos/Folio/src/main/db/index.ts#L1014-L1019)).
- `words_written`: Palabras acumuladas en ese día.
- `scenes_created`: Escenas creadas en ese día.
- `chapters_created`: Capítulos creados en ese día.
- `goal_met`: Booleano (`0` o `1`) que indica si `words_written >= daily_word_goal` en el momento de actualizar el registro.

### 2.3. `unlocked_achievements` (Logros Desbloqueados)
Guarda de forma permanente los hitos conseguidos en un proyecto, con restricción `UNIQUE(project_id, achievement_key)`:
- `id`: Autoincremental.
- `project_id`: ID del libro.
- `achievement_key`: Identificador único del logro (ej. `'words_500'`, `'streak_3'`).
- `unlocked_at`: Timestamp exacto del momento en que se desbloqueó.

---

## 3. Cómo Funcionan las Metas y las Métricas Paso a Paso

### 3.1. Flujo de Carga Inicial (`fetchGoals`)
Cuando se abre la aplicación o se cambia de libro en [`DashboardView.vue`](file:///c:/Users/arsin/Desktop/Proyectos/Folio/src/renderer/src/views/DashboardView.vue#L397), se invoca [`goalsStore.fetchGoals(projectId)`](file:///c:/Users/arsin/Desktop/Proyectos/Folio/src/renderer/src/stores/goalsStore.ts#L162-L187), que llama por IPC a [`getGoalsSummary(projectId)`](file:///c:/Users/arsin/Desktop/Proyectos/Folio/src/main/db/index.ts#L1270-L1286). Esta función ejecuta 6 operaciones síncronas en SQLite:
1. **`config`**: Obtiene o crea la fila en `project_goals`.
2. **`todayLog`**: Busca en `daily_writing_logs` la fila de hoy (`YYYY-MM-DD`). Si no existe todavía en la base de datos, devuelve un objeto virtual en memoria con `id: 0` y contadores a `0` (no inserta fila vacía en SQLite hasta que haya actividad real).
3. **`recentHistory`**: Obtiene los últimos **30 registros** de `daily_writing_logs` ordenados por `date DESC`.
4. **`unlockedAchievements`**: Obtiene todos los logros desbloqueados del proyecto ordenados por `unlocked_at DESC`.
5. **`totalManuscriptWords`**: Ejecuta [`getTotalManuscriptWords(projectId)`](file:///c:/Users/arsin/Desktop/Proyectos/Folio/src/main/db/index.ts#L1210-L1226), que recorre todos los folios activos (`is_archived = 0`) del proyecto en SQLite, elimina etiquetas HTML con `replace(/<[^>]*>/g, ' ').trim()` y suma sus palabras (`split(/\s+/).length`).
6. **`currentStreak`**: Calcula la racha actual mediante [`calculateCurrentStreak(recentHistory)`](file:///c:/Users/arsin/Desktop/Proyectos/Folio/src/main/db/index.ts#L1228-L1268).
7. Una vez recibidos estos datos en el frontend, `fetchGoals` ejecuta inmediatamente `await checkAchievements()`.

---

### 3.2. Conteo de Palabras: Los 3 Contadores Distintos del Sistema
En Folio coexisten **tres mecanismos distintos** de conteo de palabras que funcionan con reglas diferentes:

| Contador | Dónde vive | Cómo se calcula | Cuándo se actualiza |
| :--- | :--- | :--- | :--- |
| **1. Palabras de Sesión (`+X sesión`)** | [`folioStore.sessionWordsAdded`](file:///c:/Users/arsin/Desktop/Proyectos/Folio/src/renderer/src/stores/folioStore.ts#L41-L72) | Guarda en `baselineWordCounts` las palabras que tenía cada folio al seleccionarlo por primera vez en la sesión. Calcula `Math.max(0, palabrasActuales - baseline)` por folio y los suma. | **En tiempo real (Zero-Lag)** en cada pulsación de tecla desde TipTap (`@stats="handleEditorStats"`). Se reinicia a `0` al cerrar la app. |
| **2. Palabras Diarias (`todayLog.wordsWritten`)** | [`goalsStore.todayLog.wordsWritten`](file:///c:/Users/arsin/Desktop/Proyectos/Folio/src/renderer/src/stores/goalsStore.ts#L36-L44) y tabla `daily_writing_logs` | En [`flushSave()`](file:///c:/Users/arsin/Desktop/Proyectos/Folio/src/renderer/src/views/DashboardView.vue#L200-L208) se compara el conteo actual del folio con `lastSavedWordsMap`. Si `wordDelta > 0`, envía ese delta a SQLite (`words_written + wordDelta`). | **Con retardo de 500ms (debounce)** al dejar de escribir, al cambiar de escena, o al pulsar `Ctrl+S`. Persistente en SQLite por fecha. |
| **3. Palabras Totales del Manuscrito (`totalManuscriptWords`)** | Duplicado en [`goalsStore.totalManuscriptWords`](file:///c:/Users/arsin/Desktop/Proyectos/Folio/src/renderer/src/stores/goalsStore.ts#L48) y [`folioStore.totalManuscriptWords`](file:///c:/Users/arsin/Desktop/Proyectos/Folio/src/renderer/src/stores/folioStore.ts#L27-L31) | En `goalsStore` se carga de SQLite al inicio y luego se le suma `wordDelta` en [`recordProgress()`](file:///c:/Users/arsin/Desktop/Proyectos/Folio/src/renderer/src/stores/goalsStore.ts#L216-L221). | Al cargar proyecto y cada vez que `recordProgress` recibe un `wordDelta > 0`. |

---

### 3.3. Cálculo de la Racha Diaria (`currentStreak`)
La función [`calculateCurrentStreak(logs)`](file:///c:/Users/arsin/Desktop/Proyectos/Folio/src/main/db/index.ts#L1228-L1268) en el backend funciona así:
1. Recibe `recentHistory` (los últimos **30 días con actividad** registrados en `daily_writing_logs`).
2. Mete en un `Map<date, true>` únicamente aquellos días donde `log.goalMet === true` (es decir, días en los que se alcanzó el 100% de la meta diaria de palabras; escribir sin llegar a la meta **no** mantiene la racha).
3. Comprueba el punto de partida de la racha:
   - Si **hoy** (`todayStr`) está en el mapa con `goalMet = true`, empieza a contar hacia atrás desde **hoy**.
   - Si hoy aún **no** se ha cumplido la meta, pero **ayer** (`yesterdayStr`) sí tiene `goalMet = true`, la racha se considera "viva" y empieza a contar hacia atrás desde **ayer**.
   - Si ni hoy ni ayer tienen `goalMet = true`, la racha devuelve **`0`**.
4. Bucle hacia atrás día por día (`checkDate.setDate(checkDate.getDate() - 1)`): mientras exista entrada con `goalMet = true` para cada fecha consecutiva, incrementa `streak++`.

---

### 3.4. Línea de Tiempo de los Últimos 7 Días (`last7Days`)
En [`GoalsAndAchievementsModal.vue`](file:///c:/Users/arsin/Desktop/Proyectos/Folio/src/renderer/src/components/goals/GoalsAndAchievementsModal.vue#L101-L145):
1. Construye un mapa con `goalsStore.recentHistory`.
2. Sobrescribe/inserta la entrada de hoy usando `goalsStore.todayLog.date`, `goalsStore.todayLog.wordsWritten` y `goalsStore.isTodayGoalMet`.
3. Genera un array de 7 elementos desde `hoy - 6 días` hasta `hoy` (`i = 6` hasta `0`), mostrando:
   - Check verde si `goalMet === true`.
   - Número de palabras en color terracota si `words > 0` pero `goalMet === false`.
   - Punto neutro (`·`) si `words === 0`.

---

## 4. Catálogo Completo de Logros y Condiciones de Desbloqueo

El catálogo ([`ACHIEVEMENTS_CATALOG`](file:///c:/Users/arsin/Desktop/Proyectos/Folio/src/renderer/src/utils/achievementsCatalog.ts)) consta de **12 logros** divididos en **3 categorías**.

Cada logro define dos funciones puras que reciben el objeto `AchievementEvaluationContext`:
- `check(ctx): boolean`: Determina si se debe desbloquear.
- `getProgress(ctx): { current, target, percentage }`: Determina la barra de progreso que se muestra en la tarjeta cuando el logro aún está bloqueado.

### Categoría 1: Metas Diarias (`daily` — 3 logros)
| Key | Título | Condición Exacta (`check`) | Cálculo de Barra (`getProgress`) |
| :--- | :--- | :--- | :--- |
| `daily_goal_hit` | **Deber Cumplido** | `todayLog.wordsWritten >= config.dailyWordGoal && config.dailyWordGoal > 0` | `todayLog.wordsWritten / config.dailyWordGoal` |
| `daily_goal_double` | **Doble Jornada** | `todayLog.wordsWritten >= config.dailyWordGoal * 2 && config.dailyWordGoal > 0` | `todayLog.wordsWritten / (config.dailyWordGoal * 2)` |
| `daily_scene_architect` | **Arquitecto de Escenas** | `todayLog.scenesCreated >= config.dailySceneGoal && config.dailySceneGoal > 0` | `todayLog.scenesCreated / config.dailySceneGoal` |

### Categoría 2: Volumen de Obra (`volume` — 5 logros)
| Key | Título | Condición Exacta (`check`) | Cálculo de Barra (`getProgress`) |
| :--- | :--- | :--- | :--- |
| `words_500` | **Primera Pluma** | `totalManuscriptWords >= 500` | `totalManuscriptWords / 500` |
| `words_5k` | **Cuento Corto** | `totalManuscriptWords >= 5000` | `totalManuscriptWords / 5000` |
| `words_20k` | **Novela en Marcha** | `totalManuscriptWords >= 20000` | `totalManuscriptWords / 20000` |
| `words_50k` | **Hito de NaNoWriMo** | `totalManuscriptWords >= 50000` | `totalManuscriptWords / 50000` |
| `words_target_hit` | **Obra Magna** | `totalManuscriptWords >= config.targetTotalWords && config.targetTotalWords > 0` | `totalManuscriptWords / config.targetTotalWords` |

### Categoría 3: Constancia y Estructura (`consistency` — 4 logros)
| Key | Título | Condición Exacta (`check`) | Cálculo de Barra (`getProgress`) |
| :--- | :--- | :--- | :--- |
| `first_chapter_closed` | **Primer Capítulo Cerrado** | `hasCompletedChapter === true` *(al menos 1 capítulo tiene $\ge 1$ escenas y **todas** sus escenas tienen `status === 'completed'`)* | `0 / 1` (0%) ó `1 / 1` (100%) |
| `chapter_master` | **Maestro de Capítulos** | `chaptersCount >= 3` *(`folioStore.chapters.length >= 3`, excluyendo archivados)* | `chaptersCount / 3` |
| `streak_3` | **Constancia de Hierro** | `currentStreak >= 3` | `currentStreak / 3` |
| `streak_7` | **Hábito Editorial** | `currentStreak >= 7` | `currentStreak / 7` |

### ¿Cuándo se ejecuta el motor evaluador `checkAchievements()`?
Actualmente, [`goalsStore.checkAchievements()`](file:///c:/Users/arsin/Desktop/Proyectos/Folio/src/renderer/src/stores/goalsStore.ts#L111-L159) se invoca en **4 lugares**:
1. Al terminar de cargar las metas de un proyecto (`goalsStore.fetchGoals`).
2. Al guardar cambios en la configuración de metas (`goalsStore.updateConfig`).
3. Al registrar un avance de palabras, escenas o capítulos (`goalsStore.recordProgress`).
4. Al actualizar un folio cuyo `status` sea `'completed'` en [`folioStore.updateFolio`](file:///c:/Users/arsin/Desktop/Proyectos/Folio/src/renderer/src/stores/folioStore.ts#L195-L197).

---

## 5. Auditoría de Inconsistencias, Bugs Lógicos y Casos Borde Detectados

A continuación se detallan **todos los problemas de consistencia, sincronización y lógica** que tiene la implementación actual y que explican por qué a veces las métricas, rachas, barras o notificaciones no se comportan de forma consistente:

---

### 🔴 Inconsistencia Crítica 1: `currentStreak` NUNCA se actualiza en vivo al cumplir la meta del día (Logros de Racha Rotos en Sesión)
- **Dónde ocurre:** [`goalsStore.recordProgress()`](file:///c:/Users/arsin/Desktop/Proyectos/Folio/src/renderer/src/stores/goalsStore.ts#L207-L238).
- **Qué pasa exactamente:**
  - `currentStreak` solo se calcula cuando se llama a `fetchGoals()` (al abrir la app o cambiar de libro).
  - Cuando el usuario escribe hoy y supera su meta diaria (`updatedLog.goalMet === true`), `recordProgress()` actualiza `todayLog.value = updatedLog`, pero **NO recalcula `currentStreak.value` ni actualiza `recentHistory.value`**.
- **Consecuencias visibles:**
  1. **La píldora inferior no muestra la racha de 1 día:** Si hoy es tu primer día cumpliendo la meta, pasas de racha `0` a `1`. La meta se pone al 100% en verde y sale el Toast de *"¡Meta Diaria Alcanzada!"*, pero **la llama de racha (`1d`) no aparece en `GoalsProgressPill`** ni en el modal hasta que cierres y vuelvas a abrir la aplicación.
  2. **Los logros `streak_3` ("Constancia de Hierro") y `streak_7` ("Hábito Editorial") NO saltan al cumplir la meta:** Si llevabas 2 días de racha (ayer y anteayer) y hoy alcanzas el 100% de tu meta diaria, `currentStreak.value` en Pinia sigue valiendo `2`. Cuando `checkAchievements()` se ejecuta en la línea 234, ve `currentStreak: 2` y **no desbloquea el logro**. El logro salta de golpe la próxima vez que abras el programa o cambies de proyecto.

---

### 🔴 Inconsistencia Crítica 2: Colisión de Toasts (El logro "aplasta" al aviso de Meta Diaria o a otros logros simultáneos)
- **Dónde ocurre:** [`goalsStore.showToast()`](file:///c:/Users/arsin/Desktop/Proyectos/Folio/src/renderer/src/stores/goalsStore.ts#L85-L100) y [`goalsStore.recordProgress()`](file:///c:/Users/arsin/Desktop/Proyectos/Folio/src/renderer/src/stores/goalsStore.ts#L224-L234).
- **Qué pasa exactamente:**
  - `activeToast` es una única variable (`ref<ToastNotification | null>`), **no una cola (queue)**. Llamar a `showToast()` borra el `toastTimer` anterior y reemplaza inmediatamente `activeToast.value`.
  - Cuando el usuario alcanza por primera vez su meta diaria (ej. 500 palabras):
    1. En la línea 225 de `recordProgress()`, se llama a `showToast()` con **"¡Meta Diaria Alcanzada! 🎉"**.
    2. En la línea 234 (apenas unos milisegundos después), se llama a `await checkAchievements()`.
    3. `checkAchievements()` desbloquea `daily_goal_hit` (**"Deber Cumplido"**) y llama a `showToast()`, **machacando instantáneamente el toast de "¡Meta Diaria Alcanzada!"** antes de que la animación de entrada de 300ms siquiera haya empezado.
    4. Peor aún: si esas 500 palabras también desbloquean `words_500` (**"Primera Pluma"**) en la misma iteración del bucle `for` de `checkAchievements()`, el toast de *"Primera Pluma"* machaca al de *"Deber Cumplido"*.
- **Consecuencia visible:** De 2 o 3 notificaciones que deberían mostrarse secuencialmente, el usuario **solo ve la última**; las anteriores desaparecen en menos de 10ms.

---

### 🔴 Inconsistencia Crítica 3: Inflación de Palabras al Borrar/Reescribir o Cortar/Pegar (`wordDelta` asimétrico)
- **Dónde ocurre:** [`DashboardView.vue` (`flushSave`)](file:///c:/Users/arsin/Desktop/Proyectos/Folio/src/renderer/src/views/DashboardView.vue#L200-L208).
- **Código actual:**
  ```ts
  const prevWords = lastSavedWordsMap.get(targetId) ?? currentWords
  const wordDelta = currentWords - prevWords
  if (wordDelta > 0 && projectStore.activeProjectId) {
    goalsStore.recordProgress({ wordDelta })
  }
  lastSavedWordsMap.set(targetId, currentWords)
  ```
- **Qué pasa exactamente:**
  - Si una escena tiene `1.000` palabras y el autor selecciona un párrafo de `300` palabras y lo **corta (`Ctrl+X`)** o lo **borra**:
    - Pasan 500ms y se ejecuta `flushSave()`.
    - `currentWords` es `700`, `prevWords` era `1000` $\rightarrow$ `wordDelta = -300`.
    - Como `wordDelta > 0` es `false`, **no se resta nada** en `recordProgress`, pero `lastSavedWordsMap` **sí se actualiza a `700`**.
  - Un segundo después, el autor **pega (`Ctrl+V`)** ese mismo párrafo (o pulsa **`Ctrl+Z`** para deshacer el borrado):
    - `currentWords` vuelve a ser `1000`, `prevWords` era `700` $\rightarrow$ `wordDelta = +300`.
    - ¡El sistema registra **+300 palabras nuevas** aunque el texto no haya ganado ni una sola palabra real!
- **Consecuencias visibles:**
  1. Cortar y pegar un texto de 1.000 palabras (para moverlo de párrafo o de una escena a otra) suma +1.000 palabras falsas a la meta diaria y desbloquea logros diarios por error.
  2. Reescribir o editar una frase varias veces infla el contador diario y desincroniza el total del manuscrito.

---

### 🔴 Inconsistencia Crítica 4: Desincronización de `totalManuscriptWords` (Dos fuentes de verdad distintas)
- **Dónde ocurre:** [`goalsStore.totalManuscriptWords`](file:///c:/Users/arsin/Desktop/Proyectos/Folio/src/renderer/src/stores/goalsStore.ts#L48) vs [`folioStore.totalManuscriptWords`](file:///c:/Users/arsin/Desktop/Proyectos/Folio/src/renderer/src/stores/folioStore.ts#L27-L31).
- **Qué pasa exactamente:**
  - `folioStore.totalManuscriptWords` es un `computed` que calcula siempre con exactitud la suma de palabras de todos los folios activos en memoria.
  - En cambio, `goalsStore.totalManuscriptWords` es un `ref<number>` independiente que se inicializa al cargar el proyecto y luego solo se incrementa sumando `wordDelta` cuando `wordDelta > 0` ([`goalsStore.ts` L216-221](file:///c:/Users/arsin/Desktop/Proyectos/Folio/src/renderer/src/stores/goalsStore.ts#L216-L221)).
  - **Nunca se actualiza cuando:**
    - El usuario borra palabras de una escena (`wordDelta < 0`).
    - El usuario envía una escena o capítulo entero a la Papelera (`trashStore.moveToTrash`).
    - El usuario restaura una escena o capítulo desde la Papelera (`trashStore.restoreItem`).
  - Y además acumula toda la inflación artificial descrita en la Inconsistencia 3.
- **Consecuencia visible:** El número de palabras totales del libro que muestra el modal de Expectativas y las barras de los logros de volumen (`Primera Pluma`, `Cuento Corto`, `Novela en Marcha`, `Hito de NaNoWriMo`, `Obra Magna`) deja de coincidir con las palabras reales del manuscrito durante la sesión.

---

### 🟠 Inconsistencia 5: Desfase en Tiempo Real entre `+X sesión` y la Píldora de Meta Diaria
- **Dónde ocurre:** Pie de página de [`DashboardView.vue`](file:///c:/Users/arsin/Desktop/Proyectos/Folio/src/renderer/src/views/DashboardView.vue#L936-L946).
- **Qué pasa exactamente:**
  - En la barra inferior están juntos `+X sesión` (`folioStore.sessionWordsAdded`) y `<GoalsProgressPill />` (`goalsStore.todayLog.wordsWritten`).
  - `+X sesión` se actualiza instantáneamente mientras escribes (`handleEditorStats`), pero `GoalsProgressPill` solo se actualiza cuando salta el autoguardado (`flushSave`, 500ms después de dejar de teclear).
  - Además, `+X sesión` mide el balance neto sobre la línea base del folio (`Math.max(0, palabrasActuales - palabrasAlAbrir)`), mientras que `todayLog.wordsWritten` suma deltas entre guardados de 500ms. Si borras 20 palabras que habías escrito hace 2 minutos y escribes 20 nuevas, `+X sesión` no sube hasta que superes el máximo anterior, pero `todayLog.wordsWritten` sí sube +20.

---

### 🟠 Inconsistencia 6: Meta de Escenas (`dailySceneGoal` y logro *"Arquitecto de Escenas"*) no coincide con lo que promete la UI
- **Dónde ocurre:** [`GoalsAndAchievementsModal.vue` L651](file:///c:/Users/arsin/Desktop/Proyectos/Folio/src/renderer/src/components/goals/GoalsAndAchievementsModal.vue#L651), [`achievementsCatalog.ts` L84](file:///c:/Users/arsin/Desktop/Proyectos/Folio/src/renderer/src/utils/achievementsCatalog.ts#L84) y [`folioStore.ts` L130-145](file:///c:/Users/arsin/Desktop/Proyectos/Folio/src/renderer/src/stores/folioStore.ts#L130-L145).
- **Qué pasa exactamente:**
  - En el modal dice: *"Meta diaria de escenas nuevas o finalizadas"*.
  - En la descripción del logro `daily_scene_architect` dice: *"Cumplir la meta diaria de escenas creadas o trabajadas hoy"*.
  - Sin embargo, en el código solo se llama a `goalsStore.recordProgress({ sceneDelta: 1 })` dentro de `folioStore.createScene()`.
  - **No se registra progreso de escena** cuando el autor redacta en una escena ya creada días atrás, ni tampoco cuando cambia el estado de una escena a `"completed"` (`Finalizado`).
  - Por el contrario, pulsar el botón `+` para crear una escena en blanco incrementa `scenesCreated` inmediatamente aunque tenga 0 palabras y aunque se borre 2 segundos después.
  - Además, en el modal **no se muestra en ninguna parte de la pestaña "Expectativas" cuántas escenas llevas hoy** (solo hay un input para configurar la meta de escenas, pero ningún indicador visual de `todayLog.scenesCreated / config.dailySceneGoal` salvo que busques la tarjeta del logro *"Arquitecto de Escenas"* mientras aún no esté desbloqueado).

---

### 🟠 Inconsistencia 7: Qué ocurre cuando el usuario cambia su Meta Diaria (`updateConfig`) a mitad del día
- **Dónde ocurre:** [`updateProjectGoals()`](file:///c:/Users/arsin/Desktop/Proyectos/Folio/src/main/db/index.ts#L1051-L1071) y [`goalsStore.isTodayGoalMet`](file:///c:/Users/arsin/Desktop/Proyectos/Folio/src/renderer/src/stores/goalsStore.ts#L77-L79).
- **Caso A (El usuario sube su meta después de haberla cumplido):**
  - La meta era `500` palabras. El usuario escribió `600` palabras hoy $\rightarrow$ en SQLite `daily_writing_logs.goal_met` quedó guardado como `1` (`true`).
  - El usuario abre el modal y sube su meta diaria a `1.000` palabras.
  - Como el getter en `goalsStore.ts` es:
    ```ts
    const isTodayGoalMet = computed(() => {
      return todayLog.value.goalMet || todayLog.value.wordsWritten >= config.value.dailyWordGoal
    })
    ```
    Al ser `todayLog.value.goalMet === true`, **`isTodayGoalMet` sigue devolviendo `true`** aunque lleve `600 / 1000` (60%). La píldora sigue verde y la línea de tiempo de 7 días sigue mostrando el check verde de meta cumplida al 60%.
- **Caso B (El usuario baja su meta por debajo de lo que ya escribió hoy):**
  - La meta era `1.000` palabras y escribió `600` hoy (`goal_met = 0` en SQLite).
  - Abre el modal y baja su meta diaria a `500` palabras.
  - En `updateProjectGoals()` (backend) se actualiza `project_goals`, pero **no se actualiza `goal_met = 1` en `daily_writing_logs`** ni se recalcula `currentStreak`. Si el usuario cierra la app sin escribir una palabra más hoy, en SQLite ese día se queda con `goal_met = 0` y al día siguiente su racha se habrá roto.

---

### 🟠 Inconsistencia 8: Condición de Carrera (Race Condition) en el Arranque al Evaluar Capítulos
- **Dónde ocurre:** [`DashboardView.vue` L391-398 y L430-437](file:///c:/Users/arsin/Desktop/Proyectos/Folio/src/renderer/src/views/DashboardView.vue#L391-L398).
- **Qué pasa exactamente:**
  - Al iniciar la app o cambiar de libro, `folioStore.fetchFolios(projectId)` y `goalsStore.fetchGoals(projectId)` se lanzan **en paralelo** con `Promise.all([...])`.
  - `goalsStore.fetchGoals` ejecuta al terminar `await checkAchievements()`, el cual lee `folioStore.chapters` y `folioStore.getScenesForChapter(...)` para evaluar `chapter_master` (*"Maestro de Capítulos"*) y `first_chapter_closed` (*"Primer Capítulo Cerrado"*).
  - Si la promesa IPC de `fetchGoals` resuelve unos milisegundos antes que `fetchFolios`:
    - En el arranque inicial: `folioStore.chapters` aún es `[]` (0 capítulos).
    - Al cambiar de un Libro A (con 4 capítulos) a un Libro B (con 1 capítulo): `folioStore.chapters` todavía contiene los 4 capítulos del Libro A cuando `checkAchievements()` evalúa el Libro B, **pudiendo desbloquearle al Libro B logros de capítulos que pertenecían al Libro A**.

---

### 🟡 Inconsistencia 9: Logros Dinámicos (`daily_goal_hit`, `words_target_hit`) y Cambios de Configuración
- **Dónde ocurre:** [`goalsStore.updateConfig()`](file:///c:/Users/arsin/Desktop/Proyectos/Folio/src/renderer/src/stores/goalsStore.ts#L190-L204) y `unlocked_achievements`.
- **Qué pasa:**
  - Los logros en `unlocked_achievements` son irreversibles una vez desbloqueados, pero 4 de los 12 logros dependen de umbrales configurables por el usuario (`daily_goal_hit`, `daily_goal_double`, `daily_scene_architect`, `words_target_hit`).
  - Cuando el usuario ya ha desbloqueado *"Deber Cumplido"* (`daily_goal_hit`) el primer día de uso, ese logro queda marcado como `"Obtenido"` para siempre en la vitrina, por lo que en los días siguientes ya no vuelve a mostrar barra de progreso diaria en la pestaña de Logros.
  - Por otro lado, si un libro tiene 600 palabras y el autor cambia temporalmente la meta global del libro a 500 palabras (o prueba los controles y guarda), `updateConfig()` llama inmediatamente a `checkAchievements()` y desbloquea para siempre **"Obra Magna"** (`words_target_hit`), aunque acto seguido vuelva a fijar la meta en 50.000 palabras.

---

### 🟡 Inconsistencia 10: Detalles Menores de Fechas, Comandos y Código Huérfano
1. **Cambio de día con la app abierta (Medianoche):**
   - `todayLog` se carga al abrir el proyecto. Si el autor está escribiendo desde las 23:45 hasta las 00:15 sin escribir nada nuevo tras las 00:00, la UI sigue mostrando las palabras de ayer como si fueran de hoy hasta que se dispare un nuevo `recordProgress`. Y cuando se dispara `recordProgress` a las 00:05, `todayLog` pasa a ser el del nuevo día, pero el día anterior (ayer) no se añade a `recentHistory` en memoria hasta que se recargue `fetchGoals`, por lo que ayer desaparece temporalmente de la gráfica de los últimos 7 días (`last7Days`).
2. **Inicialización de fecha en UTC vs Local:**
   - En [`goalsStore.ts` L39](file:///c:/Users/arsin/Desktop/Proyectos/Folio/src/renderer/src/stores/goalsStore.ts#L39), el estado inicial por defecto usa `new Date().toISOString().split('T')[0]` (UTC), mientras que el resto de la app usa hora local (`getLocalDateStr`).
   - En [`GoalsAndAchievementsModal.vue` L93](file:///c:/Users/arsin/Desktop/Proyectos/Folio/src/renderer/src/components/goals/GoalsAndAchievementsModal.vue#L93), `new Date(editDeadlineDate.value)` parsea `'YYYY-MM-DD'` en UTC, mientras que `today` está en hora local, pudiendo restar 1 día de más según la zona horaria.
3. **Comando "Guardar Manuscrito" en la Paleta (`Ctrl+K`) se salta el registro de palabras:**
   - En [`commandsRegistry.ts` L248](file:///c:/Users/arsin/Desktop/Proyectos/Folio/src/renderer/src/components/palette/commandsRegistry.ts#L248), el comando `manual-save` llama a `folioStore.saveCurrentFolio()` (que además no le pasa `editFolioContent` de `DashboardView`), saltándose `flushSave()` y por tanto sin contabilizar `wordDelta` en `goalsStore`.
4. **Creación de capítulo pero sin logros asociados al eliminar/restaurar:**
   - Si el usuario crea un 3er capítulo desde la UI (`createChapter`), se llama a `recordProgress({ chapterDelta: 1 })` (que a su vez llama a `checkAchievements()`). Pero si el usuario **restaura un 3er capítulo desde la Papelera** (`trashStore.restoreItem`), `checkAchievements()` no se invoca.
5. **Campo fantasma `dailyChapterGoal`:**
   - Existe en la tabla `project_goals`, en los tipos, en `goalsStore` y como `ref` en `GoalsAndAchievementsModal.vue` (`editDailyChapters`), pero no tiene ningún control en el template ni ningún logro que lo utilice.

---

## 6. Resumen de Puntos Clave a Resolver para Lograr Consistencia Total

Para que el sistema de metas y logros sea **100% consistente, predecible y libre de desincronizaciones** (sin alterar su diseño UX/UI actual), estas son las correcciones lógicas recomendadas:

1. **Unificar `totalManuscriptWords` con la verdad real del manuscrito:**
   - Hacer que `goalsStore.totalManuscriptWords` lea o se sincronice directamente con `folioStore.totalManuscriptWords` (o recalcularlo siempre que cambie el contenido, se borre texto, se envíe un folio a la papelera o se restaure), evitando que haya dos contadores distintos.
2. **Corregir el cálculo de palabras diarias para evitar inflación por Cortar/Pegar o Borrar/Reescribir:**
   - Registrar la línea base de palabras de cada folio en el día o permitir que `wordDelta` refleje el **balance neto real** (o ajustar `lastSavedWordsMap` para que borrar y volver a escribir hasta el mismo umbral no regale palabras duplicadas).
3. **Recalcular `currentStreak` y `recentHistory` en vivo dentro de `recordProgress` y `updateConfig`:**
   - Cuando `recordProgress` o `updateConfig` cambian el estado de `goalMet` del día de hoy en el backend (`src/main/db/index.ts`), devolver también el `currentStreak` y `recentHistory` actualizados (o actualizarlos en `goalsStore`), **antes** de ejecutar `checkAchievements()`. Así la racha en la píldora y los logros de 3 y 7 días se activarán en el instante exacto en que se alcanza la meta.
4. **Implementar una Cola de Toasts (`toastQueue`) en `goalsStore`:**
   - En lugar de machacar `activeToast` cuando se cumplen varios hitos a la vez (ej. *Meta Diaria* + *Logro "Deber Cumplido"* + *Logro "Primera Pluma"*), encolarlos en un array `toastQueue` para que cuando uno termine sus 4.5 segundos (o el usuario lo cierre), aparezca suavemente el siguiente.
5. **Eliminar la Race Condition en `DashboardView.vue`:**
   - Asegurar que `folioStore.fetchFolios(projectId)` termine **antes** de que `goalsStore.fetchGoals(projectId)` ejecute `checkAchievements()`, para que nunca evalúe capítulos de un libro anterior ni evalúe con la lista vacía.
6. **Alinear la Meta Diaria de Escenas con su descripción:**
   - Contabilizar también cuando una escena cambia su estado a `'completed'` por primera vez en el día (o definir claramente si cuenta crear escena con contenido / finalizar escena), evitando que crear escenas vacías regale el logro.


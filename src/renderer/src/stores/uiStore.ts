import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const DEFAULT_LEFT_WIDTH = 260
export const MIN_LEFT_WIDTH = 200
export const MAX_LEFT_WIDTH = 480

export const DEFAULT_RIGHT_WIDTH = 340
export const MIN_RIGHT_WIDTH = 260
export const MAX_RIGHT_WIDTH = 640

// Tema Claro por Defecto (Papel Cálido Editorial)
export const DEFAULT_BUTTON_COLOR = '#C85A32'
export const DEFAULT_TEXT_COLOR = '#261C14'
export const DEFAULT_BG_COLOR = '#EFEAE1'

export interface ThemeColorPreset {
  id: string
  name: string
  mode: 'light' | 'dark'
  buttonColor: string
  textColor: string
  backgroundColor: string
}

export const THEME_COLOR_PRESETS: ThemeColorPreset[] = [
  // 3 Temas Modo Claro (muy diferentes entre sí)
  {
    id: 'warm-paper',
    name: 'Papel Cálido (Por defecto)',
    mode: 'light',
    buttonColor: '#C85A32',
    textColor: '#261C14',
    backgroundColor: '#EFEAE1'
  },
  {
    id: 'emerald-botanic',
    name: 'Bosque Esmeralda',
    mode: 'light',
    buttonColor: '#0D9488',
    textColor: '#112A26',
    backgroundColor: '#E2F2EE'
  },
  {
    id: 'cobalt-breeze',
    name: 'Brisa Atlántica',
    mode: 'light',
    buttonColor: '#2563EB',
    textColor: '#0F172A',
    backgroundColor: '#E6EFFA'
  },
  // 3 Temas Modo Oscuro (muy diferentes entre sí)
  {
    id: 'espresso-dark',
    name: 'Espresso Nocturno',
    mode: 'dark',
    buttonColor: '#E06D44',
    textColor: '#F5EFE6',
    backgroundColor: '#16110E'
  },
  {
    id: 'ocean-abyss',
    name: 'Abismo Oceánico',
    mode: 'dark',
    buttonColor: '#38BDF8',
    textColor: '#E2E8F0',
    backgroundColor: '#0B132B'
  },
  {
    id: 'amethyst-velvet',
    name: 'Terciopelo Amatista',
    mode: 'dark',
    buttonColor: '#C084FC',
    textColor: '#F3E8FF',
    backgroundColor: '#171124'
  }
]

// Utilidades cromáticas para generar las gamas del Background, Texto y Botones
function normalizeHex(hex: string, fallback: string): string {
  const clean = (hex || '').trim()
  if (/^#[0-9a-fA-F]{6}$/.test(clean)) return clean.toUpperCase()
  if (/^#[0-9a-fA-F]{3}$/.test(clean)) {
    const r = clean[1]
    const g = clean[2]
    const b = clean[3]
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase()
  }
  return fallback.toUpperCase()
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = normalizeHex(hex, '#EFEAE1').slice(1)
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16)
  }
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)))
  return (
    '#' +
    [clamp(r), clamp(g), clamp(b)]
      .map((x) => x.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  )
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h /= 6
  }
  return { h: h * 360, s: s * 100, l: l * 100 }
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h = ((h % 360) + 360) % 360
  s = Math.max(0, Math.min(100, s)) / 100
  l = Math.max(0, Math.min(100, l)) / 100

  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0
  let g = 0
  let b = 0

  if (h >= 0 && h < 60) {
    r = c
    g = x
  } else if (h >= 60 && h < 120) {
    r = x
    g = c
  } else if (h >= 120 && h < 180) {
    g = c
    b = x
  } else if (h >= 180 && h < 240) {
    g = x
    b = c
  } else if (h >= 240 && h < 300) {
    r = x
    b = c
  } else {
    r = c
    b = x
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255)
  }
}

export function getRelativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex)
  const [rs, gs, bs] = [r / 255, g / 255, b / 255].map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  )
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

export function mixHexColors(hexA: string, hexB: string, weightB: number): string {
  const a = hexToRgb(hexA)
  const b = hexToRgb(hexB)
  const w = Math.max(0, Math.min(1, weightB))
  return rgbToHex(
    a.r * (1 - w) + b.r * w,
    a.g * (1 - w) + b.g * w,
    a.b * (1 - w) + b.b * w
  )
}

export function shiftBackgroundGama(
  hex: string,
  lightnessDelta: number,
  saturationScale = 1
): string {
  const { r, g, b } = hexToRgb(hex)
  const hsl = rgbToHsl(r, g, b)
  const nextL = Math.max(2, Math.min(99, hsl.l + lightnessDelta))
  const nextS = Math.max(0, Math.min(100, hsl.s * saturationScale))
  const rgb = hslToRgb(hsl.h, nextS, nextL)
  return rgbToHex(rgb.r, rgb.g, rgb.b)
}

export const useUiStore = defineStore('ui', () => {
  // Panel Izquierdo: Árbol del Manuscrito
  const savedLeft = localStorage.getItem('folio:left_sidebar')
  const isLeftSidebarOpen = ref(savedLeft !== 'false')

  const savedLeftWidth = Number(localStorage.getItem('folio:left_sidebar_width'))
  const leftSidebarWidth = ref(
    savedLeftWidth && !isNaN(savedLeftWidth) && savedLeftWidth >= MIN_LEFT_WIDTH
      ? Math.min(MAX_LEFT_WIDTH, savedLeftWidth)
      : DEFAULT_LEFT_WIDTH
  )

  // Panel Derecho: Wiki / Lore Inspector
  const savedRight = localStorage.getItem('folio:right_sidebar')
  const isRightSidebarOpen = ref(savedRight !== 'false')

  const savedRightWidth = Number(localStorage.getItem('folio:right_sidebar_width'))
  const rightSidebarWidth = ref(
    savedRightWidth && !isNaN(savedRightWidth) && savedRightWidth >= MIN_RIGHT_WIDTH
      ? Math.min(MAX_RIGHT_WIDTH, savedRightWidth)
      : DEFAULT_RIGHT_WIDTH
  )

  // =========================================================================
  // MOTOR DE 3 COLORES PERSONALIZABLES (MODO CLARO POR DEFECTO)
  // 1. Botones (buttonColor)
  // 2. Texto (textColor)
  // 3. Background (backgroundColor + filtro de intensidad de gamas)
  // =========================================================================
  const buttonColor = ref<string>(
    normalizeHex(localStorage.getItem('folio:color_btn') || DEFAULT_BUTTON_COLOR, DEFAULT_BUTTON_COLOR)
  )
  const textColor = ref<string>(
    normalizeHex(localStorage.getItem('folio:color_text') || DEFAULT_TEXT_COLOR, DEFAULT_TEXT_COLOR)
  )
  const backgroundColor = ref<string>(
    normalizeHex(localStorage.getItem('folio:color_bg') || DEFAULT_BG_COLOR, DEFAULT_BG_COLOR)
  )
  const bgFilterIntensity = ref<number>(
    Number(localStorage.getItem('folio:bg_filter_intensity')) || 100
  )

  const isThemeModalOpen = ref(false)

  // Detecta automáticamente si el background elegido es oscuro o claro
  const isDark = computed(() => getRelativeLuminance(backgroundColor.value) < 0.25)

  // Gamas derivadas del mismo color de Background mediante filtros de luminosidad y mezcla
  const backgroundGamas = computed(() => {
    const bg = normalizeHex(backgroundColor.value, DEFAULT_BG_COLOR)
    const btn = normalizeHex(buttonColor.value, DEFAULT_BUTTON_COLOR)
    const txt = normalizeHex(textColor.value, DEFAULT_TEXT_COLOR)
    const k = Math.max(0.4, Math.min(1.8, bgFilterIntensity.value / 100))
    const darkBg = getRelativeLuminance(bg) < 0.25

    // Si es exactamente el tema claro por defecto al 100%, mantenemos los tonos exactos originales
    const isExactDefault =
      bg === DEFAULT_BG_COLOR &&
      btn === DEFAULT_BUTTON_COLOR &&
      txt === DEFAULT_TEXT_COLOR &&
      bgFilterIntensity.value === 100

    const bgBase = bg
    const bgSurface = isExactDefault
      ? '#F7F4EF'
      : darkBg
        ? shiftBackgroundGama(bg, 4.8 * k, 0.96)
        : shiftBackgroundGama(bg, 4.2 * k, 0.92)

    const bgElevated = isExactDefault
      ? '#FCFBF9'
      : darkBg
        ? shiftBackgroundGama(bg, 8.8 * k, 0.94)
        : shiftBackgroundGama(bg, 7.8 * k, 0.88)

    const grooveDark = isExactDefault
      ? '#D6CFC3'
      : darkBg
        ? mixHexColors(bg, '#000000', Math.min(0.75, 0.52 * k))
        : mixHexColors(bg, '#1A140E', Math.min(0.35, 0.16 * k))

    const grooveLight = isExactDefault
      ? '#FFFFFF'
      : darkBg
        ? mixHexColors(bgSurface, '#FFFFFF', Math.min(0.28, 0.11 * k))
        : mixHexColors(bg, '#FFFFFF', Math.min(0.95, 0.82 * k))

    const shadowDark = isExactDefault
      ? '#D2C9BC'
      : darkBg
        ? mixHexColors(bg, '#000000', Math.min(0.85, 0.62 * k))
        : mixHexColors(bg, '#1A140E', Math.min(0.38, 0.18 * k))

    const shadowLight = isExactDefault
      ? '#FFFFFF'
      : darkBg
        ? mixHexColors(bgSurface, '#FFFFFF', Math.min(0.22, 0.09 * k))
        : mixHexColors(bg, '#FFFFFF', Math.min(0.98, 0.88 * k))

    // Gamas filtradas específicamente para gamificación (mezcla del background con el acento)
    const gamificationCard = mixHexColors(bgSurface, btn, 0.08 * k)
    const gamificationWell = mixHexColors(bgBase, btn, 0.11 * k)
    const gamificationBadge = mixHexColors(bgBase, btn, 0.18 * k)

    // Gamas de Texto
    const textPrimary = txt
    const textSecondary = isExactDefault ? '#6E5D4F' : mixHexColors(txt, bgBase, 0.32)
    const textMuted = isExactDefault ? '#9E8F80' : mixHexColors(txt, bgBase, 0.55)

    // Gamas de Botones
    const accent = btn
    const accentHover = darkBg
      ? shiftBackgroundGama(btn, 7, 1.05)
      : shiftBackgroundGama(btn, -7, 1.05)
    const accentLight = isExactDefault ? '#D6633A' : shiftBackgroundGama(btn, 5, 1.02)
    const accentDark = isExactDefault ? '#B84E28' : shiftBackgroundGama(btn, -6, 1.02)
    const btnOnAccent = getRelativeLuminance(btn) > 0.42 ? '#1C1612' : '#F7F4EF'

    return {
      bgBase,
      bgSurface,
      bgElevated,
      grooveDark,
      grooveLight,
      shadowDark,
      shadowLight,
      gamificationCard,
      gamificationWell,
      gamificationBadge,
      textPrimary,
      textSecondary,
      textMuted,
      accent,
      accentHover,
      accentLight,
      accentDark,
      btnOnAccent
    }
  })

  function applyThemeToDOM(): void {
    const root = document.documentElement
    const g = backgroundGamas.value

    root.classList.toggle('dark', isDark.value)
    root.style.setProperty('color-scheme', isDark.value ? 'dark' : 'light')

    root.style.setProperty('--user-btn-color', g.accent)
    root.style.setProperty('--user-text-color', g.textPrimary)
    root.style.setProperty('--user-bg-color', g.bgBase)

    root.style.setProperty('--bg-base', g.bgBase)
    root.style.setProperty('--bg-surface', g.bgSurface)
    root.style.setProperty('--bg-elevated', g.bgElevated)
    root.style.setProperty('--groove-dark', g.grooveDark)
    root.style.setProperty('--groove-light', g.grooveLight)
    root.style.setProperty('--shadow-dark', g.shadowDark)
    root.style.setProperty('--shadow-light', g.shadowLight)

    root.style.setProperty('--bg-gamification-card', g.gamificationCard)
    root.style.setProperty('--bg-gamification-well', g.gamificationWell)
    root.style.setProperty('--bg-gamification-badge', g.gamificationBadge)

    root.style.setProperty('--text-primary', g.textPrimary)
    root.style.setProperty('--text-secondary', g.textSecondary)
    root.style.setProperty('--text-muted', g.textMuted)

    root.style.setProperty('--accent', g.accent)
    root.style.setProperty('--accent-hover', g.accentHover)
    root.style.setProperty('--accent-light', g.accentLight)
    root.style.setProperty('--accent-dark', g.accentDark)
    root.style.setProperty('--btn-on-accent', g.btnOnAccent)
  }

  function initTheme(): void {
    // El Modo Claro actual es el tema por defecto si no hay colores personalizados guardados
    const savedBtn = localStorage.getItem('folio:color_btn')
    const savedText = localStorage.getItem('folio:color_text')
    const savedBg = localStorage.getItem('folio:color_bg')
    const savedIntensity = Number(localStorage.getItem('folio:bg_filter_intensity'))

    buttonColor.value = normalizeHex(savedBtn || DEFAULT_BUTTON_COLOR, DEFAULT_BUTTON_COLOR)
    textColor.value = normalizeHex(savedText || DEFAULT_TEXT_COLOR, DEFAULT_TEXT_COLOR)
    backgroundColor.value = normalizeHex(savedBg || DEFAULT_BG_COLOR, DEFAULT_BG_COLOR)
    bgFilterIntensity.value =
      savedIntensity && !isNaN(savedIntensity)
        ? Math.max(50, Math.min(160, savedIntensity))
        : 100

    applyThemeToDOM()
  }

  function setCustomColors(colors: {
    buttonColor?: string
    textColor?: string
    backgroundColor?: string
    bgFilterIntensity?: number
  }): void {
    if (colors.buttonColor !== undefined) {
      buttonColor.value = normalizeHex(colors.buttonColor, DEFAULT_BUTTON_COLOR)
      localStorage.setItem('folio:color_btn', buttonColor.value)
    }
    if (colors.textColor !== undefined) {
      textColor.value = normalizeHex(colors.textColor, DEFAULT_TEXT_COLOR)
      localStorage.setItem('folio:color_text', textColor.value)
    }
    if (colors.backgroundColor !== undefined) {
      backgroundColor.value = normalizeHex(colors.backgroundColor, DEFAULT_BG_COLOR)
      localStorage.setItem('folio:color_bg', backgroundColor.value)
    }
    if (colors.bgFilterIntensity !== undefined) {
      bgFilterIntensity.value = Math.max(50, Math.min(160, Math.round(colors.bgFilterIntensity)))
      localStorage.setItem('folio:bg_filter_intensity', String(bgFilterIntensity.value))
    }
    applyThemeToDOM()
  }

  function applyPreset(preset: ThemeColorPreset): void {
    setCustomColors({
      buttonColor: preset.buttonColor,
      textColor: preset.textColor,
      backgroundColor: preset.backgroundColor,
      bgFilterIntensity: 100
    })
  }

  function resetToDefaultLightTheme(): void {
    setCustomColors({
      buttonColor: DEFAULT_BUTTON_COLOR,
      textColor: DEFAULT_TEXT_COLOR,
      backgroundColor: DEFAULT_BG_COLOR,
      bgFilterIntensity: 100
    })
  }

  function toggleTheme(): void {
    if (isDark.value) {
      resetToDefaultLightTheme()
    } else {
      const darkPreset = THEME_COLOR_PRESETS.find((p) => p.id === 'espresso-dark')!
      applyPreset(darkPreset)
    }
  }

  function openThemeModal(): void {
    isThemeModalOpen.value = true
  }

  function closeThemeModal(): void {
    isThemeModalOpen.value = false
  }

  // Compatibilidad hacia atrás con referencias existentes a isSidebarOpen
  const isSidebarOpen = computed({
    get: () => isLeftSidebarOpen.value,
    set: (val: boolean) => setLeftSidebar(val)
  })

  const isWikiOpen = computed({
    get: () => isRightSidebarOpen.value,
    set: (val: boolean) => setRightSidebar(val)
  })

  const isSplashLoading = ref(true)
  const isFocusMode = ref(false)

  function toggleLeftSidebar(): void {
    isLeftSidebarOpen.value = !isLeftSidebarOpen.value
    localStorage.setItem('folio:left_sidebar', String(isLeftSidebarOpen.value))
  }

  function setLeftSidebar(val: boolean): void {
    isLeftSidebarOpen.value = val
    localStorage.setItem('folio:left_sidebar', String(val))
  }

  function toggleSidebar(): void {
    toggleLeftSidebar()
  }

  function toggleRightSidebar(): void {
    isRightSidebarOpen.value = !isRightSidebarOpen.value
    localStorage.setItem('folio:right_sidebar', String(isRightSidebarOpen.value))
  }

  function setRightSidebar(val: boolean): void {
    isRightSidebarOpen.value = val
    localStorage.setItem('folio:right_sidebar', String(val))
  }

  function toggleWiki(): void {
    toggleRightSidebar()
  }

  function setSplashLoading(val: boolean): void {
    isSplashLoading.value = val
  }

  function toggleFocusMode(): void {
    isFocusMode.value = !isFocusMode.value
  }

  const activeWikiTab = ref<'lore' | 'rules'>('lore')

  function setActiveWikiTab(tab: 'lore' | 'rules'): void {
    activeWikiTab.value = tab
  }

  function openWikiRules(): void {
    activeWikiTab.value = 'rules'
    setRightSidebar(true)
  }

  function openWikiLore(): void {
    activeWikiTab.value = 'lore'
    setRightSidebar(true)
  }

  function setLeftSidebarWidth(width: number): void {
    const clamped = Math.max(MIN_LEFT_WIDTH, Math.min(MAX_LEFT_WIDTH, Math.round(width)))
    leftSidebarWidth.value = clamped
    localStorage.setItem('folio:left_sidebar_width', String(clamped))
  }

  function setRightSidebarWidth(width: number): void {
    const clamped = Math.max(MIN_RIGHT_WIDTH, Math.min(MAX_RIGHT_WIDTH, Math.round(width)))
    rightSidebarWidth.value = clamped
    localStorage.setItem('folio:right_sidebar_width', String(clamped))
  }

  function resetLeftSidebarWidth(): void {
    setLeftSidebarWidth(DEFAULT_LEFT_WIDTH)
  }

  function resetRightSidebarWidth(): void {
    setRightSidebarWidth(DEFAULT_RIGHT_WIDTH)
  }

  function resetSidebarWidths(): void {
    resetLeftSidebarWidth()
    resetRightSidebarWidth()
  }

  return {
    DEFAULT_LEFT_WIDTH,
    MIN_LEFT_WIDTH,
    MAX_LEFT_WIDTH,
    DEFAULT_RIGHT_WIDTH,
    MIN_RIGHT_WIDTH,
    MAX_RIGHT_WIDTH,
    DEFAULT_BUTTON_COLOR,
    DEFAULT_TEXT_COLOR,
    DEFAULT_BG_COLOR,
    leftSidebarWidth,
    rightSidebarWidth,
    setLeftSidebarWidth,
    setRightSidebarWidth,
    resetLeftSidebarWidth,
    resetRightSidebarWidth,
    resetSidebarWidths,
    isLeftSidebarOpen,
    isRightSidebarOpen,
    isSidebarOpen,
    isWikiOpen,
    activeWikiTab,
    isSplashLoading,
    isFocusMode,
    isDark,
    buttonColor,
    textColor,
    backgroundColor,
    bgFilterIntensity,
    backgroundGamas,
    isThemeModalOpen,
    initTheme,
    setCustomColors,
    applyPreset,
    resetToDefaultLightTheme,
    openThemeModal,
    closeThemeModal,
    toggleTheme,
    toggleLeftSidebar,
    setLeftSidebar,
    toggleSidebar,
    toggleRightSidebar,
    setRightSidebar,
    toggleWiki,
    setActiveWikiTab,
    openWikiRules,
    openWikiLore,
    setSplashLoading,
    toggleFocusMode
  }
})

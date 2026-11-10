/**
 * Paleta de colores predefinidos para etiquetas y categorías visuales de capítulos y wiki en Folio.
 * Proporciona colores cálidos, contrastados y elegantes en sintonía con la estética editorial neumórfica.
 */

export interface CategoryColorPreset {
  name: string
  value: string
  description: string
}

export const CATEGORY_COLOR_PRESETS: CategoryColorPreset[] = [
  { name: 'Carmín', value: '#EF4444', description: 'Acción, tensión o conflicto principal' },
  { name: 'Terracota', value: '#F97316', description: 'Trama secundaria, calidez o aventura' },
  { name: 'Ámbar', value: '#F59E0B', description: 'Revelaciones, pistas o misterios' },
  { name: 'Salvia', value: '#84CC16', description: 'Pausa, transición o naturaleza' },
  { name: 'Esmeralda', value: '#10B981', description: 'Aliados, esperanza o resolución' },
  { name: 'Cerceta', value: '#14B8A6', description: 'Atmósfera mística o viaje' },
  { name: 'Azul Cielo', value: '#0EA5E9', description: 'Pensamientos, introspección o recuerdos' },
  { name: 'Índigo', value: '#6366F1', description: 'Magia, tecnología o noche' },
  { name: 'Amatista', value: '#8B5CF6', description: 'Lore antiguo, realeza o secretos' },
  { name: 'Rosa Flor', value: '#EC4899', description: 'Vínculos, romance o emociones intensas' },
  { name: 'Sepia Cuero', value: '#A27B5C', description: 'Historia del mundo, mitología o prólogos' },
  { name: 'Grafito', value: '#64748B', description: 'Neutral, borrador o contexto' }
]

/**
 * Determina si un color hexadecimal es claro para calcular contraste de icono o texto.
 */
export function isLightColor(hex: string): boolean {
  if (!hex) return false
  const cleanHex = hex.replace('#', '')
  if (cleanHex.length !== 6 && cleanHex.length !== 3) return false
  const r =
    cleanHex.length === 3
      ? parseInt(cleanHex[0] + cleanHex[0], 16)
      : parseInt(cleanHex.substring(0, 2), 16)
  const g =
    cleanHex.length === 3
      ? parseInt(cleanHex[1] + cleanHex[1], 16)
      : parseInt(cleanHex.substring(2, 4), 16)
  const b =
    cleanHex.length === 3
      ? parseInt(cleanHex[2] + cleanHex[2], 16)
      : parseInt(cleanHex.substring(4, 6), 16)

  // Luminancia percibida
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.65
}

/**
 * Devuelve el estilo CSS adecuado para un badge, punto o tag neumórfico con el color elegido.
 */
export function getCategoryBadgeStyle(color?: string | null): Record<string, string> {
  if (!color) return {}

  return {
    backgroundColor: `${color}22`,
    borderColor: `${color}88`,
    color: color,
    boxShadow: `0 0 8px ${color}33`
  }
}


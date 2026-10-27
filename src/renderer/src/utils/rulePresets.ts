export interface RulePresetTemplate {
  category: string
  title: string
  axiom: string
  limitations: string
  details?: string
}

export interface GenrePresetConfig {
  categories: string[]
  templates: RulePresetTemplate[]
}

export const GENRE_PRESETS: Record<string, GenrePresetConfig> = {
  fantasy_scifi: {
    categories: [
      'Sistemas de Magia / Poderes',
      'Tecnología / Motores',
      'Leyes Naturales / Cosmología',
      'Facciones & Jerarquías'
    ],
    templates: [
      {
        category: 'Sistemas de Magia / Poderes',
        title: 'Primera Ley de la Alquimia: Intercambio Equivalente',
        axiom: 'Para obtener algo de valor alquímico, debe sacrificarse o transmutarse algo de idéntica masa y carga espiritual.',
        limitations: 'La transmutación de seres vivos o la creación espontánea de materia sin anclaje elemental destruye el sistema nervioso del taumaturgo.',
        details: 'Documentado en los Códices del Concilio Antiguo. No se conocen excepciones registradas en la época moderna.'
      },
      {
        category: 'Tecnología / Motores',
        title: 'Protocolo de Hiperpropulsión Warp',
        axiom: 'El motor taquiónico no acelera en el espacio ordinario; pliega el tejido gravitatorio entre dos puntos fijos de referencia.',
        limitations: 'Activar el salto a menos de 5 unidades astronómicas de un pozo gravitacional masivo desestabiliza el núcleo y desintegra el casco.',
        details: 'Requiere 15 minutos de refrigeración criogénica obligatoria entre trayectos estelares.'
      }
    ]
  },
  historical_epic: {
    categories: [
      'Etiqueta & Códigos de Honor',
      'Estructura Social & Castas',
      'Tratados Políticos',
      'Límites de la Época'
    ],
    templates: [
      {
        category: 'Etiqueta & Códigos de Honor',
        title: 'Código del Duelo: Desafío a Primera Sangre',
        axiom: 'Ningún noble de sangre puede desenvainar acero contra un par sin la presencia juramentada de dos padrinos y un juez de campo.',
        limitations: 'Rehusar un reto formal conlleva la pérdida inmediata de rentas feudales y la excomunión social del infractor.',
        details: 'Instituido tras la Tregua de San Martín. Las espadas deben calibrarse ante el magistrado antes de iniciar el lance.'
      },
      {
        category: 'Estructura Social & Castas',
        title: 'Línea de Sucesión de la Corona',
        axiom: 'La corona sólo se transmite al primogénito legítimo bendecido por la Iglesia Mayor en la capilla de la coronación.',
        limitations: 'Cualquier descendiente nacido fuera de matrimonio canónico carece de personería jurídica ante el Gran Consejo.',
        details: 'Una regencia temporal no puede extenderse más allá del décimo octavo natalicio del heredero legítimo.'
      }
    ]
  },
  thriller_legal: {
    categories: [
      'Procedimientos Legales',
      'Límites Jurisdiccionales',
      'Protocolos Forenses',
      'Códigos Criminales'
    ],
    templates: [
      {
        category: 'Procedimientos Legales',
        title: 'Cadena de Custodia de Evidencias Balísticas',
        axiom: 'Toda prueba física recogida en el lugar del suceso debe ser lacrada, cronometrada y firmada por el perito judicial a cargo.',
        limitations: 'La rotura involuntaria de un precinto anula toda validez probatoria en sede judicial por doctrina del fruto del árbol envenenado.',
        details: 'Cualquier retraso superior a 6 horas entre la recogida en escena y el depósito central requiere declaración jurada justificativa.'
      },
      {
        category: 'Límites Jurisdiccionales',
        title: 'Acción Policial en Aguas Internacionales',
        axiom: 'Los agentes estatales carecen de potestad de abordaje fuera de las 12 millas náuticas sin autorización expresa del país de pabellón.',
        limitations: 'Una detención no autorizada fuera de la zona contigua genera un conflicto diplomático vinculante y la liberación inmediata de los retenidos.',
        details: 'Convenio de Ginebra sobre el Derecho del Mar, artículo 111 (derecho de persecución caliente).'
      }
    ]
  },
  mystery_horror: {
    categories: [
      'Reglas de la Entidad / Asesino',
      'Límites de Comunicación',
      'Tabúes Locales',
      'Mecánicas de Supervivencia'
    ],
    templates: [
      {
        category: 'Reglas de la Entidad / Asesino',
        title: 'Manifestación Nocturna del Espectro',
        axiom: 'La presencia sólo puede materializarse donde la luz del sol ha desaparecido por completo y el observador se encuentra en soledad absoluta.',
        limitations: 'La cercanía de fuego vivo o una mirada directa sin parpadear detiene su avance durante un lapso de cinco respiraciones.',
        details: 'El espectro no puede cruzar umbrales marcados con sal consagrada durante el equinoccio.'
      },
      {
        category: 'Tabúes Locales',
        title: 'El Toque de Queda del Campanario',
        axiom: 'Al sonar la decimotercera campanada, todas las puertas exteriores deben asegurarse con cerrojo de hierro forjado.',
        limitations: 'Responder al llamado de una voz familiar que provenga del exterior tras la última campanada sella el destino de los moradores de la casa.',
        details: 'Tradición arraigada desde el invierno de 1842 tras la desaparición de la familia Miller.'
      }
    ]
  },
  general_other: {
    categories: [
      'Normas Sociales',
      'Principios del Entorno',
      'Límites Físicos',
      'Pactos & Acuerdos'
    ],
    templates: [
      {
        category: 'Normas Sociales',
        title: 'Principio de Hospitalidad y Refugio',
        axiom: 'Quien comparte el pan y la sal bajo un techo ajeno está protegido contra la violencia mutua hasta el amanecer siguiente.',
        limitations: 'Atacar a un huésped bajo juramento de hospitalidad desata el repudio de la comunidad y la rescisión de todo pacto comercial.',
        details: 'Aplica sin distinción de facción, credo o rencilla familiar previa.'
      },
      {
        category: 'Límites Físicos',
        title: 'Agotamiento Térmico del Páramo Helado',
        axiom: 'Cualquier esfuerzo físico intenso a temperaturas bajo cero consume el triple de calorías corporales por hora de marcha.',
        limitations: 'La exposición continua sin abrigo adecuado induce hipotermia severa y alucinaciones en menos de dos horas.',
        details: 'Los viajeros experimentados nunca acampan en hondonadas donde se acumula el aire glacial nocturno.'
      }
    ]
  }
}

/**
 * Determina qué presets de categorías y plantillas corresponden al género del proyecto.
 */
export function getPresetsForGenre(genre?: string): GenrePresetConfig {
  if (!genre) return GENRE_PRESETS.general_other

  const g = genre.toLowerCase().trim()

  if (
    g.includes('fantas') ||
    g.includes('sci-fi') ||
    g.includes('ciencia') ||
    g.includes('ficcion') ||
    g.includes('cyber') ||
    g.includes('space') ||
    g.includes('magia') ||
    g.includes('distop')
  ) {
    return GENRE_PRESETS.fantasy_scifi
  }

  if (
    g.includes('histor') ||
    g.includes('epic') ||
    g.includes('medieval') ||
    g.includes('epoca') ||
    g.includes('victorian') ||
    g.includes('drama') ||
    g.includes('caball')
  ) {
    return GENRE_PRESETS.historical_epic
  }

  if (
    g.includes('thrill') ||
    g.includes('polic') ||
    g.includes('judic') ||
    g.includes('legal') ||
    g.includes('crim') ||
    g.includes('noir') ||
    g.includes('detectiv') ||
    g.includes('suspens')
  ) {
    return GENRE_PRESETS.thriller_legal
  }

  if (
    g.includes('mister') ||
    g.includes('terror') ||
    g.includes('horror') ||
    g.includes('paranormal') ||
    g.includes('gotic') ||
    g.includes('psicolog')
  ) {
    return GENRE_PRESETS.mystery_horror
  }

  return GENRE_PRESETS.general_other
}

/**
 * Lista combinada de todas las categorías predeterminadas del sistema.
 */
export function getAllPresetCategories(): string[] {
  const set = new Set<string>()
  for (const group of Object.values(GENRE_PRESETS)) {
    for (const cat of group.categories) {
      set.add(cat)
    }
  }
  return Array.from(set).sort()
}

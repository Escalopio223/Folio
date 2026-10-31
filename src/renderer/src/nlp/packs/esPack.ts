import type { LanguagePack } from '../types'

const SPANISH_STOPWORDS = new Set([
  'de', 'la', 'que', 'el', 'en', 'y', 'a', 'los', 'del', 'se', 'las', 'por', 'un', 'para', 'con',
  'no', 'una', 'su', 'al', 'lo', 'como', 'mas', 'pero', 'sus', 'le', 'ya', 'o', 'fue', 'este',
  'ha', 'si', 'porque', 'esta', 'son', 'entre', 'cuando', 'muy', 'sin', 'sobre', 'ser', 'tiene',
  'tambien', 'me', 'hasta', 'hay', 'donde', 'quien', 'desde', 'todo', 'nos', 'durante', 'todos',
  'uno', 'les', 'ni', 'contra', 'otros', 'ese', 'eso', 'ante', 'ellos', 'e', 'esto', 'mi', 'antes',
  'algunos', 'que', 'unos', 'yo', 'otro', 'otras', 'otra', 'el', 'tanto', 'esa', 'estos', 'mucho',
  'quienes', 'nada', 'muchos', 'cual', 'sea', 'poco', 'ella', 'estar', 'haber', 'estas', 'estaba',
  'estamos', 'algunas', 'algo', 'nosotros', 'mi', 'mis', 'tu', 'tus', 'te', 'ti', 'habia', 'eran',
  'era', 'sido', 'fueron', 'hacia', 'tras', 'asi', 'pues', 'tan', 'cada', 'bien', 'solo', 'aun',
  'mientras', 'hizo', 'hacer', 'dijo', 'decir', 'aqui', 'alli', 'alla', 'ahi', 'vez', 'veces'
])

function normalizeSpanish(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

/**
 * Stemmer ligero para español enfocado a agrupar lemas literarios
 */
export function stemSpanish(word: string): string {
  let s = normalizeSpanish(word)
  if (s.length <= 3) return s

  // Sufijos de adverbios en -mente
  if (s.endsWith('mente') && s.length > 7) {
    s = s.slice(0, -5)
  }

  // Sufijos verbales comunes en narrativa
  const verbSuffixes = [
    'arian', 'arias', 'ariamos', 'aria',
    'eriam', 'erias', 'eriamos', 'eria',
    'iriam', 'irias', 'iriamos', 'iria',
    'abamos', 'abais', 'aban', 'abas', 'aba',
    'iamos', 'iais', 'ian', 'ias', 'ia',
    'aremos', 'areis', 'aran', 'aras', 'ara',
    'eremos', 'ereis', 'eran', 'eras', 'era',
    'iremos', 'ireis', 'iran', 'iras', 'ira',
    'asteis', 'aron', 'ando', 'ieron', 'iendo',
    'aste', 'amos', 'aron', 'iste', 'imos',
    'aron', 'ieron'
  ]
  for (const suf of verbSuffixes) {
    if (s.endsWith(suf) && s.length - suf.length >= 3) {
      s = s.slice(0, -suf.length)
      break
    }
  }

  // Sufijos de diminutivos / aumentativos
  if ((s.endsWith('ito') || s.endsWith('ita') || s.endsWith('itos') || s.endsWith('itas')) && s.length > 5) {
    s = s.replace(/it[oas]+$/, '')
  }

  // Plurales
  if (s.endsWith('es') && s.length > 4) {
    s = s.slice(0, -2)
  } else if (s.endsWith('s') && !s.endsWith('ss') && s.length > 3) {
    s = s.slice(0, -1)
  }

  return s
}

/**
 * Diccionario literario offline con > 160 términos frecuentes y sinónimos ricos
 */
const SPANISH_SYNONYMS: Record<string, string[]> = {
  // Sustantivos literarios
  sombra: ['penumbra', 'silueta', 'oscuridad', 'tiniebla', 'perfil'],
  luz: ['claridad', 'resplandor', 'fulgor', 'destello', 'luminosidad'],
  silencio: ['quietud', 'calma', 'sosiego', 'mudez', 'paz'],
  miedo: ['temor', 'pavor', 'terror', 'espanto', 'inquietud'],
  voz: ['tono', 'timbre', 'murmullo', 'eco', 'sonido'],
  ojo: ['mirada', 'pupila', 'iris', 'globo ocular'],
  rostro: ['semblante', 'faz', 'cara', 'expresion', 'fisonomia'],
  mano: ['palma', 'dedos', 'extremidad', 'garra'],
  noche: ['penumbra', 'oscuridad', 'ocaso', 'tinieblas', 'crepusculo'],
  viento: ['brisa', 'vendaval', 'aire', 'corriente', 'rafaga'],
  camino: ['senda', 'sendero', 'ruta', 'trayecto', 'vereda'],
  puerta: ['umbral', 'entrada', 'acceso', 'porton', 'cancela'],
  habitacion: ['estancia', 'aposento', 'cuarto', 'sala', 'recamara'],
  casa: ['hogar', 'morada', 'residencia', 'vivienda', 'refugio'],
  cuerpo: ['figura', 'silueta', 'anatomia', 'organismo'],
  fuego: ['llama', 'lumbre', 'hoguera', 'ardor', 'fulgor'],
  cielo: ['firmamento', 'boveda celeste', 'horizonte', 'altura'],
  tierra: ['suelo', 'terreno', 'polvo', 'barro', 'superficie'],
  agua: ['corriente', 'manantial', 'caudal', 'liquido', 'fluido'],
  piedra: ['roca', 'guijarro', 'bloque', 'laja', 'peniasco'],
  dolor: ['tormento', 'suplicio', 'padecimiento', 'punzada', 'pesar'],
  rabia: ['furia', 'ira', 'colera', 'enojo', 'indignacion'],
  tristeza: ['melancolia', 'desconsuelo', 'afliccion', 'pesar', 'desolacion'],
  alegria: ['gozo', 'jubilo', 'entusiasmo', 'dicha', 'deleite'],
  tiempo: ['instante', 'momento', 'epoca', 'periodo', 'duracion'],
  corazon: ['pecho', 'entrañas', 'alma', 'pulso'],
  arma: ['filo', 'hoja', 'hierro', 'instrumento', 'defensa'],
  espada: ['hoja', 'acero', 'filo', 'sable', 'estoque'],
  bosque: ['arboleda', 'espesura', 'selva', 'monte', 'soto'],
  muerte: ['fin', 'desenlace', 'fallecimiento', 'ocaso', 'partida'],
  vida: ['existencia', 'aliento', 'vitalidad', 'ser'],
  ciudad: ['urbe', 'poblacion', 'metropoli', 'villa'],
  recuerdo: ['memoria', 'reminiscencia', 'evocacion', 'anhelo'],
  pensamiento: ['reflexion', 'idea', 'cavilacion', 'meditacion'],
  palabra: ['termino', 'vocablo', 'expresion', 'frase'],
  grito: ['alarido', 'clamor', 'chillido', 'bramido', 'aullido'],
  paso: ['pisada', 'avance', 'marcha', 'zancada'],
  sangre: ['icor', 'fluido vital', 'gotas rojas', 'humor'],
  fuerza: ['vigor', 'potencia', 'energia', 'empuje', 'brio'],
  sonrisa: ['mueca', 'gesto', 'semblante risueño'],
  lagrima: ['gota', 'llanto', 'sollozo'],
  abismo: ['precipicio', 'vacio', 'hondonada', 'sima'],
  secreto: ['misterio', 'enigma', 'arcano', 'confidencia'],
  destino: ['hado', 'azar', 'fortuna', 'porvenir'],
  frio: ['helada', 'gélido', 'escarcha', 'frescor'],
  calor: ['bochorno', 'ardor', 'fogonazo', 'calidez'],

  // Verbos frecuentes en prosa literaria
  mirar: ['observar', 'contemplar', 'atisbar', 'fijar la vista', 'escrutar'],
  ver: ['divisar', 'distinguir', 'percibir', 'avistar', 'notar'],
  caminar: ['avanzar', 'andar', 'recorrer', 'deambular', 'marchar'],
  correr: ['apresurarse', 'huir', 'precipitarse', 'volar'],
  hablar: ['conversar', 'charlar', 'pronunciar', 'dialogar', 'manifestar'],
  decir: ['afirmar', 'expresar', 'declarar', 'asegurar', 'murmurar'],
  pensar: ['reflexionar', 'meditar', 'cavilar', 'suponer', 'rumiar'],
  sentir: ['experimentar', 'percibir', 'notar', 'palpar', 'intuir'],
  escuchar: ['oir', 'atender', 'prestar atencion', 'captar'],
  saber: ['conocer', 'ignorar', 'comprender', 'entender'],
  entrar: ['adentrarse', 'penetrar', 'acceder', 'ingresar'],
  salir: ['abandonar', 'alejarse', 'partir', 'emerger', 'asomar'],
  abrir: ['descubrir', 'descorrer', 'desplegar', 'franquear'],
  cerrar: ['clausurar', 'sellar', 'ajustar', 'taponar'],
  parar: ['detenerse', 'frenar', 'hacer una pausa', 'inmovilizarse'],
  caer: ['derrumbarse', 'desplomarse', 'precipitarse', 'hundirse'],
  levantar: ['alzar', 'elevar', 'incorporarse', 'erigir'],
  esperar: ['aguardar', 'permanecer', 'confiar', 'hacer tiempo'],
  buscar: ['rastrear', 'indagar', 'explorar', 'inquirir'],
  encontrar: ['hallar', 'dar con', 'descubrir', 'toparse'],
  recordar: ['rememorar', 'evocar', 'traer a la memoria'],
  olvidar: ['desatender', 'pasar por alto', 'borrar'],
  morir: ['perecer', 'sucumbir', 'expirar', 'fallecer'],
  nacer: ['brotar', 'emerger', 'surgir', 'germinar'],
  respirar: ['inhalar', 'exhalar', 'tomar aliento', 'jadear'],
  temblar: ['estremecerse', 'tiritar', 'vibrar', 'vacilar'],
  gritar: ['chillar', 'vociferar', 'bramar', 'clamar'],
  callar: ['enmudecer', 'guardar silencio', 'silenciarse'],
  responder: ['contestar', 'replicar', 'reponer', 'retrucar'],
  preguntar: ['inquirir', 'interrogar', 'cuestionar', 'consultar'],
  golpear: ['impactar', 'azotar', 'sacudir', 'asestar', 'batir'],
  tocar: ['rozar', 'palpar', 'acariciar', 'rozar suavemente'],
  acercar: ['aproximar', 'arrimar', 'estrechar'],
  alejar: ['apartar', 'distanciar', 'retirar', 'ahuyentar'],
  desaparecer: ['desvanecerse', 'esfumarse', 'disiparse', 'perderse'],
  aparecer: ['surgir', 'manifestarse', 'asomar', 'presentarse'],
  cambiar: ['transformar', 'mutar', 'variar', 'alterar'],
  quedar: ['permanecer', 'restar', 'mantenerse', 'subsistir'],
  continuar: ['proseguir', 'reanudar', 'seguir', 'persistir'],
  empezar: ['comenzar', 'iniciar', 'emprender', 'principiar'],
  terminar: ['finalizar', 'concluir', 'culminar', 'rematar'],

  // Adjetivos narrativos
  oscuro: ['sombrio', 'tenebroso', 'opaco', 'lóbrego', 'apagado'],
  claro: ['luminoso', 'nitido', 'brillante', 'diafano', 'transparente'],
  rapido: ['veloz', 'presuroso', 'agil', 'fugaz', 'vertiginoso'],
  lento: ['pausado', 'tardo', 'pesado', 'calmo', 'parsimonioso'],
  fuerte: ['robusto', 'intenso', 'vigoroso', 'firme', 'solido'],
  debil: ['fragil', 'quebradizo', 'tenue', 'vulnerable', 'endeble'],
  grande: ['inmenso', 'enorme', 'vasto', 'monumental', 'colosal'],
  pequeño: ['diminuto', 'minusculo', 'reducido', 'modesto'],
  antiguo: ['ancestral', 'arcaico', 'milenario', 'veterano'],
  nuevo: ['reciente', 'novedoso', 'fresco', 'flamante'],
  pesado: ['abrumador', 'plomizo', 'denso', 'gravoso'],
  ligero: ['liviano', 'sutil', 'leve', 'gracil'],
  lejano: ['remoto', 'distante', 'apartado'],
  cercano: ['proximo', 'inmediato', 'adyacente'],
  extraño: ['singular', 'insolito', 'bizarro', 'peculiar', 'anomalo'],
  profundo: ['hondo', 'abismal', 'penetrante', 'insondable'],
  silencioso: ['mudo', 'taciturno', 'sigiloso', 'inaudible', 'discreto'],
  frio_adj: ['helado', 'gélido', 'invernal', 'cortante'],
  calido: ['templado', 'ardiente', 'acogedor', 'ferviente'],
  blanco: ['eburneo', 'palido', 'niveo', 'albo'],
  negro: ['azabache', 'oscuro', 'sombrío', 'tenebroso']
}

export const esPack: LanguagePack = {
  code: 'es',
  name: 'Español',
  minWordLength: 4,
  stopwords: SPANISH_STOPWORDS,
  stem: stemSpanish,
  synonyms: SPANISH_SYNONYMS,
  inflectReplacement: (originalWord: string, synonym: string): string => {
    if (!originalWord || !synonym) return synonym

    const isAllUpper = originalWord === originalWord.toUpperCase() && originalWord.length > 1
    const isFirstUpper =
      originalWord[0] === originalWord[0].toUpperCase() &&
      originalWord[0] !== originalWord[0].toLowerCase()

    let result = synonym.toLowerCase()

    // Si la original termina en plural simple (-s o -es) y el sinónimo está en singular
    const origLower = originalWord.toLowerCase()
    const origIsPlural =
      (origLower.endsWith('s') || origLower.endsWith('es')) &&
      !origLower.endsWith('is') &&
      !origLower.endsWith('us')

    const synIsPlural = result.endsWith('s')

    if (origIsPlural && !synIsPlural && !result.includes(' ')) {
      if (
        result.endsWith('a') ||
        result.endsWith('e') ||
        result.endsWith('i') ||
        result.endsWith('o') ||
        result.endsWith('u')
      ) {
        result += 's'
      } else {
        result += 'es'
      }
    }

    if (isAllUpper) return result.toUpperCase()
    if (isFirstUpper) return result.charAt(0).toUpperCase() + result.slice(1)
    return result
  }
}

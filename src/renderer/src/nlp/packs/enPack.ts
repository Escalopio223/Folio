import type { LanguagePack } from '../types'

const ENGLISH_STOPWORDS = new Set([
  'the', 'and', 'to', 'of', 'a', 'in', 'that', 'is', 'was', 'he', 'for', 'it', 'with', 'as',
  'his', 'on', 'be', 'at', 'by', 'i', 'this', 'had', 'not', 'are', 'but', 'from', 'or', 'she',
  'an', 'they', 'which', 'you', 'one', 'we', 'all', 'were', 'her', 'would', 'there', 'their',
  'will', 'when', 'who', 'him', 'been', 'has', 'more', 'if', 'no', 'out', 'do', 'so', 'can',
  'what', 'up', 'said', 'about', 'other', 'into', 'than', 'then', 'now', 'could', 'only', 'time',
  'some', 'these', 'two', 'may', 'then', 'them', 'first', 'very', 'any', 'my', 'now', 'such',
  'like', 'our', 'over', 'even', 'most', 'after', 'also', 'made', 'did', 'many', 'before', 'must',
  'through', 'back', 'where', 'much', 'your', 'way', 'well', 'down', 'should', 'because', 'each',
  'just', 'those', 'people', 'how', 'too', 'little', 'state', 'good', 'very', 'make', 'world', 'still'
])

export function stemEnglish(word: string): string {
  let s = (word || '').toLowerCase().trim()
  if (s.length <= 3) return s

  if (s.endsWith('ing') && s.length > 5) s = s.slice(0, -3)
  else if (s.endsWith('ed') && s.length > 4) s = s.slice(0, -2)
  else if (s.endsWith('ly') && s.length > 4) s = s.slice(0, -2)
  else if (s.endsWith('es') && s.length > 4) s = s.slice(0, -2)
  else if (s.endsWith('s') && !s.endsWith('ss') && s.length > 3) s = s.slice(0, -1)

  return s
}

const ENGLISH_SYNONYMS: Record<string, string[]> = {
  shadow: ['silhouette', 'shade', 'darkness', 'gloom', 'obscurity'],
  light: ['glow', 'gleam', 'radiance', 'illumination', 'spark'],
  silence: ['stillness', 'quiet', 'hush', 'calm', 'peace'],
  fear: ['dread', 'terror', 'fright', 'apprehension', 'panic'],
  voice: ['tone', 'murmur', 'whisper', 'sound', 'utterance'],
  eyes: ['gaze', 'glance', 'sight', 'pupils', 'vision'],
  walk: ['stride', 'pace', 'wander', 'tread', 'march'],
  look: ['gaze', 'peer', 'glance', 'stare', 'behold'],
  say: ['whisper', 'mutter', 'utter', 'declare', 'state'],
  dark: ['dim', 'gloomy', 'somber', 'shadowy', 'murky'],
  night: ['evening', 'dusk', 'twilight', 'darkness', 'midnight'],
  fast: ['swift', 'quick', 'rapid', 'brisk', 'fleet'],
  slow: ['sluggish', 'gradual', 'steady', 'measured', 'deliberate'],
  cold: ['chilly', 'frosty', 'frigid', 'icy', 'biting'],
  warm: ['tepid', 'balmy', 'cozy', 'heated', 'radiant'],
  door: ['gateway', 'portal', 'threshold', 'entry', 'entrance'],
  room: ['chamber', 'hall', 'space', 'quarters', 'parlor'],
  house: ['dwelling', 'home', 'residence', 'abode', 'shelter'],
  road: ['path', 'trail', 'track', 'route', 'avenue'],
  wind: ['breeze', 'gust', 'gale', 'draft', 'current'],
  thought: ['reflection', 'notion', 'idea', 'muse', 'contemplation'],
  blood: ['gore', 'vital fluid', 'lifeblood', 'ichor']
}

export const enPack: LanguagePack = {
  code: 'en',
  name: 'English',
  minWordLength: 4,
  stopwords: ENGLISH_STOPWORDS,
  stem: stemEnglish,
  synonyms: ENGLISH_SYNONYMS,
  inflectReplacement: (originalWord: string, synonym: string): string => {
    if (!originalWord || !synonym) return synonym

    const isAllUpper = originalWord === originalWord.toUpperCase() && originalWord.length > 1
    const isFirstUpper =
      originalWord[0] === originalWord[0].toUpperCase() &&
      originalWord[0] !== originalWord[0].toLowerCase()

    let result = synonym.toLowerCase()
    const origLower = originalWord.toLowerCase()

    if (origLower.endsWith('s') && !result.endsWith('s') && !result.includes(' ')) {
      result += 's'
    }

    if (isAllUpper) return result.toUpperCase()
    if (isFirstUpper) return result.charAt(0).toUpperCase() + result.slice(1)
    return result
  }
}

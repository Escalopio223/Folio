import type { Node as PMNode } from '@tiptap/pm/model'
import type { LanguagePack } from '../nlp/types'

export interface EchoOccurrence {
  word: string
  stem: string
  from: number
  to: number
  tokenIndex: number
}

export interface EchoCluster {
  id: string
  stem: string
  occurrences: EchoOccurrence[]
  count: number
}

export interface EchoDetectorOptions {
  windowSizeWords: number // 60, 120, 250
  minRepetitions: number // 2, 3
  ignoredStems: Set<string>
  wikiExcludedStems: Set<string>
}

/**
 * Extrae tokens de palabras del documento ProseMirror con sus coordenadas exactas
 */
export function extractDocumentTokens(
  doc: PMNode,
  pack: LanguagePack,
  ignoredStems: Set<string>,
  wikiExcludedStems: Set<string>
): EchoOccurrence[] {
  const tokens: EchoOccurrence[] = []
  let tokenIndex = 0

  doc.descendants((node, pos) => {
    if (node.isText && node.text) {
      // Regex que busca secuencias de palabras
      const regex = /[\p{L}\p{N}]+/gu
      let match: RegExpExecArray | null

      while ((match = regex.exec(node.text)) !== null) {
        const rawWord = match[0]
        const cleanLower = rawWord.toLowerCase()

        // Filtro de longitud mínima
        if (cleanLower.length < pack.minWordLength) {
          tokenIndex++
          continue
        }

        // Filtro de números puros
        if (/^\d+$/.test(cleanLower)) {
          tokenIndex++
          continue
        }

        // Filtro de stopwords del idioma
        if (pack.stopwords.has(cleanLower)) {
          tokenIndex++
          continue
        }

        const stem = pack.stem(cleanLower)

        // Filtro de palabras ignoradas de sesión o entidades de la Wiki
        if (ignoredStems.has(stem) || wikiExcludedStems.has(stem)) {
          tokenIndex++
          continue
        }

        const from = pos + match.index
        const to = from + rawWord.length

        tokens.push({
          word: rawWord,
          stem,
          from,
          to,
          tokenIndex
        })

        tokenIndex++
      }
    }
    return true
  })

  return tokens
}

/**
 * Algoritmo de Ventana Deslizante (Sliding Window) para detectar repeticiones cercanas
 */
export function detectEchoClusters(
  tokens: EchoOccurrence[],
  windowSizeWords: number,
  minRepetitions: number
): { clusters: EchoCluster[]; occurrencesMap: Map<number, EchoCluster> } {
  const clusters: EchoCluster[] = []
  const occurrencesMap = new Map<number, EchoCluster>() // key: from -> Cluster
  const totalTokens = tokens.length

  if (totalTokens === 0) {
    return { clusters, occurrencesMap }
  }

  // Agrupar por stem y posiciones
  const stemPositions = new Map<string, EchoOccurrence[]>()
  for (const token of tokens) {
    let list = stemPositions.get(token.stem)
    if (!list) {
      list = []
      stemPositions.set(token.stem, list)
    }
    list.push(token)
  }

  // Evaluar cercanía en ventana deslizante para cada stem
  let clusterCounter = 0

  for (const [stem, list] of stemPositions.entries()) {
    if (list.length < minRepetitions) continue

    // Detectar subconjuntos que caen dentro de la ventana de proximidad
    const matchedIndices = new Set<number>()

    for (let i = 0; i < list.length; i++) {
      const current = list[i]
      const nearby: number[] = [i]

      // Mirar hacia adelante mientras la distancia en tokens esté dentro de windowSizeWords
      for (let j = i + 1; j < list.length; j++) {
        const next = list[j]
        if (next.tokenIndex - current.tokenIndex <= windowSizeWords) {
          nearby.push(j)
        } else {
          break
        }
      }

      if (nearby.length >= minRepetitions) {
        for (const idx of nearby) {
          matchedIndices.add(idx)
        }
      }
    }

    if (matchedIndices.size >= minRepetitions) {
      const matchedOccurrences = Array.from(matchedIndices)
        .sort((a, b) => a - b)
        .map((idx) => list[idx])

      clusterCounter++
      const cluster: EchoCluster = {
        id: `echo-${stem}-${clusterCounter}`,
        stem,
        occurrences: matchedOccurrences,
        count: matchedOccurrences.length
      }

      clusters.push(cluster)

      for (const occ of matchedOccurrences) {
        occurrencesMap.set(occ.from, cluster)
      }
    }
  }

  return { clusters, occurrencesMap }
}

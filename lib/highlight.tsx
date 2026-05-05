import { disassemble, getChoseong } from 'es-hangul'

type Range = {
  start: number
  end: number
}

function uniqueTerms(query: string, extraTerms: string[] = []): string[] {
  return Array.from(
    new Set(
      [...query.trim().split(/\s+/), ...extraTerms]
        .map((term) => term.trim())
        .filter((term) => term.length > 0)
    )
  )
}

function addRange(ranges: Range[], start: number, end: number) {
  if (start < 0 || end <= start) return
  ranges.push({ start, end })
}

function mergeRanges(ranges: Range[]): Range[] {
  const sorted = ranges.sort((a, b) => a.start - b.start || b.end - a.end)
  const merged: Range[] = []

  for (const range of sorted) {
    const prev = merged.at(-1)
    if (!prev || range.start > prev.end) {
      merged.push({ ...range })
    } else {
      prev.end = Math.max(prev.end, range.end)
    }
  }

  return merged
}

function buildDisassembledIndex(text: string, toDisassembled: (char: string) => string) {
  let value = ''
  const map: Range[] = []
  let offset = 0

  for (const char of Array.from(text)) {
    const start = offset
    const end = start + char.length
    const disassembled = toDisassembled(char.toLowerCase())
    value += disassembled
    for (let i = 0; i < disassembled.length; i++) {
      map.push({ start, end })
    }
    offset = end
  }

  return { value, map }
}

function findAll(haystack: string, needle: string): number[] {
  const positions: number[] = []
  if (!needle) return positions

  let start = 0
  while (start < haystack.length) {
    const pos = haystack.indexOf(needle, start)
    if (pos === -1) break
    positions.push(pos)
    start = pos + Math.max(needle.length, 1)
  }

  return positions
}

export function getHighlightRanges(text: string, query: string, extraTerms: string[] = []): Range[] {
  const terms = uniqueTerms(query, extraTerms)
  if (!terms.length) return []

  const ranges: Range[] = []
  const lowerText = text.toLowerCase()
  const disassembledIndex = buildDisassembledIndex(text, disassemble)
  const choseongIndex = buildDisassembledIndex(text, getChoseong)

  for (const term of terms) {
    const lowerTerm = term.toLowerCase()
    for (const pos of findAll(lowerText, lowerTerm)) {
      addRange(ranges, pos, pos + lowerTerm.length)
    }

    const disassembledTerm = disassemble(lowerTerm)
    for (const pos of findAll(disassembledIndex.value, disassembledTerm)) {
      const start = disassembledIndex.map[pos]?.start
      const end = disassembledIndex.map[pos + disassembledTerm.length - 1]?.end
      if (start !== undefined && end !== undefined) addRange(ranges, start, end)
    }

    const choseongTerm = getChoseong(lowerTerm)
    if (choseongTerm.length > 0) {
      for (const pos of findAll(choseongIndex.value, choseongTerm)) {
        const start = choseongIndex.map[pos]?.start
        const end = choseongIndex.map[pos + choseongTerm.length - 1]?.end
        if (start !== undefined && end !== undefined) addRange(ranges, start, end)
      }
    }
  }

  return mergeRanges(ranges)
}

export function highlight(
  text: string,
  query: string,
  markClassName: string,
  extraTerms: string[] = []
): React.ReactNode {
  const ranges = getHighlightRanges(text, query, extraTerms)
  if (!ranges.length) return text

  const parts: React.ReactNode[] = []
  let cursor = 0
  ranges.forEach((range, i) => {
    if (cursor < range.start) parts.push(text.slice(cursor, range.start))
    parts.push(
      <mark key={`${range.start}-${range.end}-${i}`} className={markClassName}>
        {text.slice(range.start, range.end)}
      </mark>
    )
    cursor = range.end
  })
  if (cursor < text.length) parts.push(text.slice(cursor))

  return parts
}

export function getHighlightedSnippets(
  body: string,
  query: string,
  extraTerms: string[] = [],
  options: { length?: number; limit?: number } = {}
): string[] {
  const length = options.length ?? 96
  const limit = options.limit ?? 2
  const ranges = getHighlightRanges(body, query, extraTerms)

  if (!ranges.length) {
    const fallback = body.slice(0, length)
    return fallback ? [fallback + (body.length > length ? '...' : '')] : []
  }

  const snippets: string[] = []
  const used = new Set<string>()

  for (const range of ranges) {
    const start = Math.max(0, range.start - 32)
    const end = Math.min(body.length, start + length)
    const key = `${start}:${end}`
    if (used.has(key)) continue
    used.add(key)
    snippets.push((start > 0 ? '...' : '') + body.slice(start, end) + (end < body.length ? '...' : ''))
    if (snippets.length >= limit) break
  }

  return snippets
}

import MiniSearch from 'minisearch'
import { disassemble, getChoseong } from 'es-hangul'
import type { SearchDoc } from './search'

export type SearchResult = SearchDoc & {
  score: number
  terms: string[]
  queryTerms: string[]
  match: Record<string, string[]>
}

export type TopicResult = { name: string; count: number; url: string }

export const MAX_RESULTS = 6

export const SEARCH_FIELDS = {
  all: ['title', 'body', 'audioTitle'],
  title: ['title'],
  body: ['body'],
} as const

export type SearchFilter = keyof typeof SEARCH_FIELDS

let miniSearch: MiniSearch | null = null
let docsCache: SearchDoc[] | null = null
let indexPromise: Promise<void> | null = null

function buildIndex(docs: SearchDoc[]): MiniSearch {
  const ms = new MiniSearch({
    fields: ['title', 'body', 'audioTitle'],
    storeFields: ['title', 'url', 'body', 'base', 'audioTitle', 'tags'],
    processTerm: (term) => disassemble(term),
    searchOptions: { boost: { title: 3, audioTitle: 0.5 }, fuzzy: 0.2, prefix: true },
  })
  ms.addAll(docs)
  return ms
}

const CHOSEONG_RE = /^[ㄱ-ㅎ\s]+$/

function isChoseongQuery(q: string): boolean {
  const trimmed = q.trim()
  return trimmed.length > 0 && CHOSEONG_RE.test(trimmed)
}

function sameFields(a: readonly string[] | undefined, b: readonly string[]): boolean {
  return a !== undefined && a.length === b.length && a.every((field, i) => field === b[i])
}

function searchChoseongDocs(q: string, fields?: readonly string[], limit?: number): SearchResult[] {
  if (!docsCache) return []
  if (sameFields(fields, SEARCH_FIELDS.body)) return []

  const query = q.replace(/\s+/g, '')
  const results: SearchResult[] = []
  const includeTitle = !fields || sameFields(fields, SEARCH_FIELDS.all) || sameFields(fields, SEARCH_FIELDS.title)
  const includeAudio = !fields || sameFields(fields, SEARCH_FIELDS.all)
  const includeBase = !fields || sameFields(fields, SEARCH_FIELDS.all)

  for (const doc of docsCache) {
    const matchedFields: string[] = []
    if (includeTitle && getChoseong(doc.title).includes(query)) matchedFields.push('title')
    if (includeAudio && doc.audioTitle && getChoseong(doc.audioTitle).includes(query)) matchedFields.push('audioTitle')
    if (includeBase && doc.tags.some((tag) => getChoseong(tag).includes(query))) matchedFields.push('base')
    if (!matchedFields.length) continue

    results.push({
      ...doc,
      score: matchedFields.includes('title') ? 3 : matchedFields.includes('audioTitle') ? 1.5 : 1,
      terms: [query],
      queryTerms: [query],
      match: { [query]: matchedFields },
    })
  }

  const sorted = results.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
  return limit === undefined ? sorted : sorted.slice(0, limit)
}

export function loadIndex(): Promise<void> {
  if (miniSearch) return Promise.resolve()
  if (!indexPromise) {
    indexPromise = fetch('/search-index.json')
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load search index: ${r.status}`)
        return r.json()
      })
      .then((docs: SearchDoc[]) => {
        docsCache = docs
        miniSearch = buildIndex(docs)
      })
      .catch((error) => {
        indexPromise = null
        throw error
      })
  }
  return indexPromise
}

export function isIndexReady(): boolean {
  return miniSearch !== null
}

export function searchDocs(q: string, fields?: readonly string[], limit = MAX_RESULTS): SearchResult[] {
  if (!miniSearch || !q.trim()) return []
  if (isChoseongQuery(q)) return searchChoseongDocs(q, fields, limit)
  return (miniSearch.search(q, fields ? { fields: [...fields] } : {}) as SearchResult[]).slice(0, limit)
}

export function searchAllDocs(q: string, fields?: readonly string[]): SearchResult[] {
  if (!miniSearch || !q.trim()) return []
  if (isChoseongQuery(q)) return searchChoseongDocs(q, fields)
  return miniSearch.search(q, fields ? { fields: [...fields] } : {}) as SearchResult[]
}

export function searchTopics(query: string): TopicResult[] {
  if (!docsCache) return []

  const counts = new Map<string, number>()
  for (const doc of docsCache) {
    for (const tag of doc.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }

  const dQuery = disassemble(query.toLowerCase().trim())
  return Array.from(counts.entries())
    .filter(([name]) => disassemble(name.toLowerCase()).includes(dQuery))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, MAX_RESULTS)
    .map(([name, count]) => ({ name, count, url: `/topics/${encodeURIComponent(name)}` }))
}

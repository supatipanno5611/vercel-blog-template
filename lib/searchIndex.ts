import MiniSearch from 'minisearch'
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
  all: ['title', 'body', 'topics', 'audioTitle'],
  title: ['title'],
  body: ['body'],
} as const

export type SearchFilter = keyof typeof SEARCH_FIELDS

let miniSearch: MiniSearch | null = null
let docsCache: SearchDoc[] | null = null
let indexPromise: Promise<void> | null = null

function buildIndex(docs: SearchDoc[]): MiniSearch {
  const ms = new MiniSearch({
    fields: ['title', 'body', 'topics', 'audioTitle'],
    storeFields: ['title', 'url', 'body', 'topics', 'audioTitle', 'tags'],
    searchOptions: { boost: { title: 3, audioTitle: 0.5 }, fuzzy: 0.2, prefix: true },
  })
  ms.addAll(docs)
  return ms
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
  return (miniSearch.search(q, fields ? { fields: [...fields] } : {}) as SearchResult[]).slice(0, limit)
}

export function searchAllDocs(q: string, fields?: readonly string[]): SearchResult[] {
  if (!miniSearch || !q.trim()) return []
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

  const normalizedQuery = query.toLowerCase().trim()
  return Array.from(counts.entries())
    .filter(([name]) => name.toLowerCase().includes(normalizedQuery))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, MAX_RESULTS)
    .map(([name, count]) => ({ name, count, url: `/topics/${encodeURIComponent(name)}` }))
}

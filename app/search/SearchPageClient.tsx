'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { getHighlightedSnippets, highlight } from '@/lib/highlight'
import {
  loadIndex,
  SEARCH_FIELDS,
  searchAllDocs,
  type SearchFilter,
  type SearchResult,
} from '@/lib/searchIndex'
import { uiText } from '@/lib/ui-text'
import styles from './page.module.css'

const FILTER_OPTIONS: { key: SearchFilter; label: string }[] = [
  { key: 'all', label: uiText.search.filters.all },
  { key: 'title', label: uiText.search.filters.title },
  { key: 'body', label: uiText.search.filters.body },
]

function readFilter(value: string | null): SearchFilter {
  return value === 'title' || value === 'body' ? value : 'all'
}

function resultTerms(result: SearchResult): string[] {
  return [...result.terms, ...result.queryTerms]
}

export default function SearchPageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlQuery = searchParams.get('q')?.trim() ?? ''
  const filter = readFilter(searchParams.get('filter'))
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(false)

  const filterFields = useMemo(() => SEARCH_FIELDS[filter], [filter])

  useEffect(() => {
    let cancelled = false

    if (!urlQuery) {
      queueMicrotask(() => {
        if (cancelled) return
        setResults([])
        setLoadError(false)
        setLoading(false)
      })
      return () => {
        cancelled = true
      }
    }

    queueMicrotask(() => {
      if (cancelled) return
      setLoading(true)
      return
    })

    loadIndex()
      .then(() => {
        if (cancelled) return
        setResults(searchAllDocs(urlQuery, filterFields))
        setLoadError(false)
      })
      .catch(() => {
        if (cancelled) return
        setResults([])
        setLoadError(true)
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [urlQuery, filterFields])

  function changeFilter(nextFilter: SearchFilter) {
    if (!urlQuery) return
    router.push(`/search?q=${encodeURIComponent(urlQuery)}&filter=${nextFilter}`)
  }

  return (
    <main className={styles.main}>
      <h1 className={styles.heading}>
        {urlQuery ? uiText.search.headingForQuery(urlQuery) : uiText.search.heading}
      </h1>
      <div className={styles.filters}>
        {FILTER_OPTIONS.map((option) => (
          <button
            key={option.key}
            className={`${styles.filterButton} ${filter === option.key ? styles.filterActive : ''}`}
            onClick={() => changeFilter(option.key)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>

      {!urlQuery ? (
        <p className={styles.status}>{uiText.search.guide}</p>
      ) : loading ? (
        <p className={styles.status}>{uiText.search.loading}</p>
      ) : loadError ? (
        <p className={styles.status}>{uiText.search.loadError}</p>
      ) : (
        <>
          <p className={styles.count}>{uiText.search.resultCount(results.length)}</p>
          {results.length === 0 ? (
            <p className={styles.status}>{uiText.search.noResults(urlQuery)}</p>
          ) : (
            <ul className={styles.results}>
              {results.map((result) => {
                const terms = resultTerms(result)
                const snippets = getHighlightedSnippets(result.body, urlQuery, terms, { limit: 2 })
                return (
                  <li key={result.id} className={styles.result}>
                    <Link href={result.url} className={styles.resultLink}>
                      <span className={styles.title}>{highlight(result.title, urlQuery, styles.mark, terms)}</span>
                      {result.audioTitle && (
                        <span className={styles.audioMeta}>
                          <span className={styles.audioLabel}>{uiText.audio.label}</span>
                          <span>{highlight(result.audioTitle, urlQuery, styles.mark, terms)}</span>
                        </span>
                      )}
                      {snippets.map((snippet) => (
                        <span key={snippet} className={styles.snippet}>
                          {highlight(snippet, urlQuery, styles.mark, terms)}
                        </span>
                      ))}
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </main>
  )
}

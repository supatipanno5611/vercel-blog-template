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
import styles from './page.module.css'

const FILTER_OPTIONS: { key: SearchFilter; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'title', label: '제목' },
  { key: 'body', label: '본문' },
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
      <h1 className={styles.heading}>{urlQuery ? `“${urlQuery}” 검색 결과` : '검색 결과'}</h1>
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
        <p className={styles.status}>제목, 본문, 오디오 제목에서 검색합니다.</p>
      ) : loading ? (
        <p className={styles.status}>검색 인덱스를 불러오는 중...</p>
      ) : loadError ? (
        <p className={styles.status}>검색을 불러오지 못했어요. 다시 시도해 주세요.</p>
      ) : (
        <>
          <p className={styles.count}>{results.length}개의 결과</p>
          {results.length === 0 ? (
            <p className={styles.status}>&quot;{urlQuery}&quot;에 대한 결과가 없어요.</p>
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
                          <span className={styles.audioLabel}>오디오</span>
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

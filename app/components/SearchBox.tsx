'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import MiniSearch from 'minisearch'
import { disassemble } from 'es-hangul'
import type { SearchDoc } from '@/lib/search'
import styles from './SearchBox.module.css'

type SearchResult = SearchDoc & {
  score: number
  terms: string[]
  queryTerms: string[]
  match: Record<string, string[]>
}

type Filter = 'all' | 'title' | 'body' | 'base'

const FILTER_OPTIONS: { key: Filter; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'title', label: '제목만' },
  { key: 'body', label: '본문만' },
  { key: 'base', label: '주제어만' },
]

const FILTER_FIELDS: Record<Filter, string[] | undefined> = {
  all: undefined,
  title: ['title'],
  body: ['body'],
  base: ['base'],
}

const PLACEHOLDERS = [
  '검색어를 입력하세요',
  '어떤 글을 찾고 계신가요?',
  '제목이나 내용으로 검색',
  '궁금한 것을 검색해보세요',
  '글 제목, 내용 검색 가능',
]

const MAX_RESULTS = 6

let miniSearch: MiniSearch | null = null
let indexPromise: Promise<void> | null = null

function buildIndex(docs: SearchDoc[]): MiniSearch {
  const ms = new MiniSearch({
    fields: ['title', 'body', 'base', 'choseong'],
    storeFields: ['title', 'url', 'body', 'base', 'tags'],
    processTerm: (term) => disassemble(term),
    searchOptions: { boost: { title: 3, base: 2 }, fuzzy: 0.2, prefix: true },
  })
  ms.addAll(docs)
  return ms
}

function loadIndex(): Promise<void> {
  if (miniSearch) return Promise.resolve()
  if (!indexPromise) {
    indexPromise = fetch('/search-index.json')
      .then((r) => r.json())
      .then((docs: SearchDoc[]) => {
        miniSearch = buildIndex(docs)
      })
  }
  return indexPromise
}

function getSnippet(body: string, query: string, length = 80): string {
  const terms = query.trim().split(/\s+/).filter(Boolean)
  const lower = body.toLowerCase()
  let pos = -1
  for (const term of terms) {
    const idx = lower.indexOf(term.toLowerCase())
    if (idx !== -1) { pos = idx; break }
  }
  if (pos === -1) return body.slice(0, length) + (body.length > length ? '…' : '')
  const start = Math.max(0, pos - 25)
  const end = Math.min(body.length, start + length)
  return (start > 0 ? '…' : '') + body.slice(start, end) + (end < body.length ? '…' : '')
}

function isTagMatched(tag: string, query: string): boolean {
  const terms = query.trim().split(/\s+/).filter(Boolean)
  const dTag = disassemble(tag.toLowerCase())
  return terms.some((t) => dTag.includes(disassemble(t.toLowerCase())))
}

function highlight(text: string, query: string): React.ReactNode {
  const terms = query.trim().split(/\s+/).filter(Boolean)
  if (!terms.length) return text
  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const parts = text.split(new RegExp(`(${escaped.join('|')})`, 'gi'))
  return parts.map((part, i) =>
    i % 2 === 1 ? <mark key={i} className={styles.mark}>{part}</mark> : part
  )
}

type Props = {
  overlayMode?: boolean
  onClose?: () => void
  initialQuery?: string
}

export default function SearchBox({ overlayMode = false, onClose, initialQuery = '' }: Props) {
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<SearchResult[]>([])
  const [activeIndex, setActiveIndex] = useState(-1)
  const [filter, setFilter] = useState<Filter>('all')
  const [placeholder, setPlaceholder] = useState(PLACEHOLDERS[0])
  const [focused, setFocused] = useState(false)
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeItemRef = useRef<HTMLLIElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const queryRef = useRef(query)
  const filterRef = useRef(filter)
  queryRef.current = query
  filterRef.current = filter

  const router = useRouter()

  useEffect(() => {
    setMounted(true)
    setPlaceholder(PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)])
  }, [])

  const doSearch = useCallback((q: string, f: Filter) => {
    if (!miniSearch || !q.trim()) return
    const fields = FILTER_FIELDS[f]
    const res = (miniSearch.search(q, fields ? { fields } : {}) as SearchResult[]).slice(0, MAX_RESULTS)
    setResults(res)
    setActiveIndex(res.length > 0 ? 0 : -1)
  }, [])

  // Initial load when URL has query
  useEffect(() => {
    if (!initialQuery) return
    setLoading(true)
    loadIndex().then(() => {
      setLoading(false)
      doSearch(initialQuery, 'all')
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Scroll active item into view
  useEffect(() => {
    activeItemRef.current?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setResults([])
        setActiveIndex(-1)
        setFocused(false)
        if (overlayMode) onClose?.()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [overlayMode, onClose])

  // `/` shortcut to focus (only when not in overlay mode; overlay mode uses ReadingHeader's handler)
  useEffect(() => {
    if (overlayMode) return
    const handler = (e: KeyboardEvent) => {
      if (e.key !== '/' || !e.ctrlKey) return
      const tag = (document.activeElement as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      e.preventDefault()
      inputRef.current?.focus()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [overlayMode])

  // Auto-focus input when in overlay mode
  useEffect(() => {
    if (overlayMode) inputRef.current?.focus()
  }, [overlayMode])

  const close = useCallback(() => {
    setResults([])
    setActiveIndex(-1)
    setFocused(false)
    inputRef.current?.blur()
    onClose?.()
  }, [onClose])

  const handleFocus = () => {
    setFocused(true)
    if (miniSearch) {
      if (queryRef.current.trim()) doSearch(queryRef.current, filterRef.current)
      return
    }
    setLoading(true)
    loadIndex().then(() => {
      setLoading(false)
      if (queryRef.current.trim()) doSearch(queryRef.current, filterRef.current)
    })
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value
    setQuery(q)
    setActiveIndex(-1)
    const params = new URLSearchParams(window.location.search)
    if (q.trim()) params.set('q', q)
    else params.delete('q')
    router.replace(`?${params.toString()}`, { scroll: false })
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!q.trim()) { setResults([]); return }
    debounceRef.current = setTimeout(() => {
      if (!miniSearch) return
      doSearch(q, filterRef.current)
    }, 250)
  }

  const handleFilterChange = (f: Filter) => {
    setFilter(f)
    if (queryRef.current.trim()) doSearch(queryRef.current, f)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      setFilter((f) => {
        const idx = FILTER_OPTIONS.findIndex((o) => o.key === f)
        const next = FILTER_OPTIONS[(idx - 1 + FILTER_OPTIONS.length) % FILTER_OPTIONS.length]
        if (queryRef.current.trim()) doSearch(queryRef.current, next.key)
        return next.key
      })
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      setFilter((f) => {
        const idx = FILTER_OPTIONS.findIndex((o) => o.key === f)
        const next = FILTER_OPTIONS[(idx + 1) % FILTER_OPTIONS.length]
        if (queryRef.current.trim()) doSearch(queryRef.current, next.key)
        return next.key
      })
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const idx = activeIndex >= 0 ? activeIndex : 0
      if (results[idx]) router.push(results[idx].url)
    } else if (e.key === 'Escape') {
      close()
    }
  }

  const handleClear = () => {
    setQuery('')
    setResults([])
    setActiveIndex(-1)
    const params = new URLSearchParams(window.location.search)
    params.delete('q')
    router.replace(`?${params.toString()}`, { scroll: false })
    inputRef.current?.focus()
  }

  const hasQuery = query.trim() !== ''
  const showDropdown = (overlayMode || focused) && hasQuery

  return (
    <>
      {mounted && createPortal(
        <>
          {overlayMode && <div className={styles.overlayBackdrop} onMouseDown={close} />}
          {!overlayMode && focused && <div className={styles.mobileOverlay} onMouseDown={close} />}
        </>,
        document.body
      )}
      <div
        className={`${styles.container} ${overlayMode ? styles.overlayContainer : focused ? styles.containerFocused : ''}`}
        ref={containerRef}
      >
        <div className={styles.inputWrap}>
          {loading ? (
            <span className={styles.spinner} aria-hidden />
          ) : (
            <svg className={styles.icon} viewBox="0 0 20 20" fill="none" aria-hidden>
              <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.6" />
              <line x1="12.5" y1="12.5" x2="17" y2="17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          )}
          <input
            ref={inputRef}
            className={styles.input}
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            autoComplete="off"
            spellCheck={false}
          />
          {hasQuery && (
            <button className={styles.clear} onClick={handleClear} aria-label="검색어 지우기">
              <svg viewBox="0 0 20 20" fill="none" aria-hidden>
                <line x1="5" y1="5" x2="15" y2="15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                <line x1="15" y1="5" x2="5" y2="15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
        {showDropdown && (
          <div className={`${styles.dropdown} ${overlayMode ? styles.overlayDropdown : ''}`} onMouseDown={(e) => e.preventDefault()}>
            <div className={styles.filters}>
              {FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  className={`${styles.filterBtn} ${filter === opt.key ? styles.filterActive : ''}`}
                  onClick={() => handleFilterChange(opt.key)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <ul className={styles.results}>
              {results.length === 0 ? (
                <li className={styles.empty}>'{query}'에 대한 결과가 없어요</li>
              ) : (
                results.map((r, i) => {
                  const matchedFields = new Set(Object.values(r.match).flat())
                  const snippet = matchedFields.has('body') ? getSnippet(r.body, query) : null
                  const showTags = r.tags.length > 0 && (filter === 'base' || (filter === 'all' && matchedFields.has('base')))
                  const isActive = i === activeIndex
                  return (
                    <li
                      key={r.id}
                      ref={isActive ? activeItemRef : null}
                      className={isActive ? styles.active : undefined}
                      onMouseEnter={() => setActiveIndex(i)}
                    >
                      <a href={r.url}>
                        <span className={styles.title}>{highlight(r.title, query)}</span>
                        {showTags && (
                          <span className={styles.tags}>
                            {r.tags.map((tag) => (
                              <span
                                key={tag}
                                className={isTagMatched(tag, query) ? styles.tagMatched : styles.tagOther}
                              >
                                {tag}
                              </span>
                            ))}
                          </span>
                        )}
                        {snippet && (
                          <span className={styles.snippet}>{highlight(snippet, query)}</span>
                        )}
                      </a>
                    </li>
                  )
                })
              )}
            </ul>
            <div className={styles.hint}>
              <span>↑↓ 이동</span>
              <span>←→ 필터</span>
              <span>Enter 선택</span>
              <span>Ctrl+/ 검색</span>
              <span>Esc 닫기</span>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

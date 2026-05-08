'use client'

import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { useClickOutside } from './hooks/useClickOutside'
import { useSearchShortcut } from './hooks/useSearchShortcut'
import {
  loadIndex,
  isIndexReady,
  searchDocs,
  searchTopics,
  type SearchResult,
  type TopicResult,
} from '@/lib/searchIndex'
import SearchResults from './SearchResults'
import styles from './SearchBox.module.css'

type Filter = 'all' | 'title' | 'body' | 'base'

const FILTER_OPTIONS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'title', label: 'Title' },
  { key: 'body', label: 'Body' },
  { key: 'base', label: 'Topic' },
]

const FILTER_FIELDS: Record<Filter, string[] | undefined> = {
  all: undefined,
  title: ['title'],
  body: ['body'],
  base: ['base'],
}

const PLACEHOLDERS = ['Search posts', 'Find a topic', 'Search title or body', 'What are you looking for?']

const noopSubscribe = () => () => {}

let cachedPlaceholder: string | null = null
const getClientPlaceholder = () => {
  if (cachedPlaceholder === null) {
    cachedPlaceholder = PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)]
  }
  return cachedPlaceholder
}
const getServerPlaceholder = () => PLACEHOLDERS[0]

type Props = {
  overlayMode?: boolean
  onClose?: () => void
  initialQuery?: string
}

export default function SearchBox({ overlayMode = false, onClose, initialQuery }: Props) {
  const [query, setQuery] = useState(initialQuery ?? '')
  const [results, setResults] = useState<SearchResult[]>([])
  const [topicResults, setTopicResults] = useState<TopicResult[]>([])
  const [activeIndex, setActiveIndex] = useState(-1)
  const [filter, setFilter] = useState<Filter>('all')
  const [focused, setFocused] = useState(false)
  const [loading, setLoading] = useState(false)

  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false)
  const placeholder = useSyncExternalStore(noopSubscribe, getClientPlaceholder, getServerPlaceholder)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeItemRef = useRef<HTMLLIElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const queryRef = useRef(query)
  const filterRef = useRef(filter)
  const router = useRouter()

  useEffect(() => {
    queryRef.current = query
    filterRef.current = filter
  })

  const resetResults = useCallback(() => {
    setResults([])
    setTopicResults([])
    setActiveIndex(-1)
  }, [])

  const doSearch = useCallback((q: string, f: Filter) => {
    if (!isIndexReady() || !q.trim()) return

    if (f === 'base') {
      setResults([])
      const res = searchTopics(q)
      setTopicResults(res)
      setActiveIndex(res.length > 0 ? 0 : -1)
      return
    }

    setTopicResults([])
    const res = searchDocs(q, FILTER_FIELDS[f])
    setResults(res)
    setActiveIndex(res.length > 0 ? 0 : -1)
  }, [])

  useEffect(() => {
    activeItemRef.current?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  useClickOutside(
    containerRef,
    useCallback(() => {
      resetResults()
      setFocused(false)
      if (overlayMode) onClose?.()
    }, [resetResults, overlayMode, onClose])
  )

  useSearchShortcut(useCallback(() => inputRef.current?.focus(), []), !overlayMode)

  useEffect(() => {
    if (overlayMode) inputRef.current?.focus()
  }, [overlayMode])

  useEffect(() => {
    if (!overlayMode) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [overlayMode])

  const close = useCallback(() => {
    resetResults()
    setFocused(false)
    inputRef.current?.blur()
    onClose?.()
  }, [onClose, resetResults])

  const handleFocus = () => {
    setFocused(true)
    if (isIndexReady()) {
      if (queryRef.current.trim()) doSearch(queryRef.current, filterRef.current)
      return
    }

    setLoading(true)
    loadIndex()
      .then(() => {
        if (queryRef.current.trim()) doSearch(queryRef.current, filterRef.current)
      })
      .catch(() => {
        resetResults()
      })
      .finally(() => {
        setLoading(false)
      })
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value
    setQuery(q)
    setActiveIndex(-1)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!q.trim()) {
      resetResults()
      return
    }

    debounceRef.current = setTimeout(() => {
      if (isIndexReady()) doSearch(q, filterRef.current)
    }, 250)
  }

  const handleFilterChange = (f: Filter) => {
    setFilter(f)
    if (f === 'base') setResults([])
    else setTopicResults([])
    if (queryRef.current.trim()) doSearch(queryRef.current, f)
  }

  const activeListLength = filter === 'base' ? topicResults.length + 1 : results.length

  const rotateFilter = (dir: 1 | -1) => {
    setFilter((f) => {
      const idx = FILTER_OPTIONS.findIndex((option) => option.key === f)
      const next = FILTER_OPTIONS[(idx + dir + FILTER_OPTIONS.length) % FILTER_OPTIONS.length]
      if (queryRef.current.trim()) doSearch(queryRef.current, next.key)
      return next.key
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, activeListLength - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      rotateFilter(-1)
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      rotateFilter(1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const idx = activeIndex >= 0 ? activeIndex : 0

      if (filter === 'base') {
        if (topicResults[idx]) {
          router.push(topicResults[idx].url)
          close()
        } else {
          router.push('/topics/search')
          close()
        }
      } else if (results[idx]) {
        router.push(results[idx].url)
        close()
      }
    } else if (e.key === 'Escape') {
      close()
    }
  }

  const handleClear = () => {
    setQuery('')
    resetResults()
    inputRef.current?.focus()
  }

  const hasQuery = query.trim() !== ''
  const showDropdown = overlayMode || (focused && hasQuery)

  return (
    <>
      {mounted &&
        createPortal(
          <>
            {overlayMode && <div className={styles.overlayBackdrop} onClick={close} />}
            {!overlayMode && focused && <div className={styles.mobileOverlay} onMouseDown={close} />}
          </>,
          document.body
        )}
      <div
        className={`${styles.container} ${overlayMode ? styles.overlayContainer : focused ? styles.containerFocused : ''}`}
        ref={containerRef}
      >
        <div className={styles.inputWrap}>
          {overlayMode && (
            <button className={styles.backButton} onClick={close} aria-label="Close search">
              <svg viewBox="0 0 20 20" fill="none" aria-hidden>
                <polyline
                  points="12,4 6,10 12,16"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
          <div className={styles.inputField}>
            {loading ? (
              <span className={styles.spinner} aria-hidden />
            ) : (
              <svg className={styles.icon} viewBox="0 0 20 20" fill="none" aria-hidden>
                <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.6" />
                <line
                  x1="12.5"
                  y1="12.5"
                  x2="17"
                  y2="17"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
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
              <button className={styles.clear} onClick={handleClear} aria-label="Clear search">
                <svg viewBox="0 0 20 20" fill="none" aria-hidden>
                  <line x1="5" y1="5" x2="15" y2="15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  <line x1="15" y1="5" x2="5" y2="15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        </div>
        {showDropdown && (
          <div
            className={`${styles.dropdown} ${overlayMode ? styles.overlayDropdown : ''}`}
            onMouseDown={(e) => e.preventDefault()}
          >
            <div className={styles.filters}>
              {FILTER_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  className={`${styles.filterBtn} ${filter === option.key ? styles.filterActive : ''}`}
                  onClick={() => handleFilterChange(option.key)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <SearchResults
              filter={filter}
              query={query}
              hasQuery={hasQuery}
              results={results}
              topicResults={topicResults}
              activeIndex={activeIndex}
              onActiveChange={setActiveIndex}
              onClose={close}
              activeItemRef={activeItemRef}
            />
            <div className={styles.hint}>
              <span>Arrows move</span>
              <span>Left/right filter</span>
              <span>Enter open</span>
              <span>Esc close</span>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

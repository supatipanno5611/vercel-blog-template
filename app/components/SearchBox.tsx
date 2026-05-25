'use client'

import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { useClickOutside } from './hooks/useClickOutside'
import { useSearchShortcut } from './hooks/useSearchShortcut'
import {
  loadIndex,
  isIndexReady,
  MAX_RESULTS,
  SEARCH_FIELDS,
  searchDocs,
  searchTopics,
  type SearchResult,
  type TopicResult,
} from '@/lib/searchIndex'
import { uiText } from '@/lib/ui-text'
import SearchResults from './SearchResults'
import { BackIcon, SearchIcon, XIcon } from './icons'
import styles from './SearchBox.module.css'

type Filter = 'all' | 'title' | 'body' | 'topics'

const FILTER_OPTIONS: { key: Filter; label: string }[] = [
  { key: 'all', label: uiText.search.filters.all },
  { key: 'title', label: uiText.search.filters.title },
  { key: 'body', label: uiText.search.filters.body },
  { key: 'topics', label: uiText.search.filters.topics },
]

const FILTER_FIELDS: Record<Filter, string[] | undefined> = {
  all: [...SEARCH_FIELDS.all],
  title: [...SEARCH_FIELDS.title],
  body: [...SEARCH_FIELDS.body],
  topics: undefined,
}

const RESULTS_ID = 'global-search-results'

const noopSubscribe = () => () => {}

let cachedPlaceholder: string | null = null
const getClientPlaceholder = () => {
  if (cachedPlaceholder === null) {
    cachedPlaceholder = uiText.search.placeholders[Math.floor(Math.random() * uiText.search.placeholders.length)]
  }
  return cachedPlaceholder
}
const getServerPlaceholder = () => uiText.search.placeholders[0]

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
  const [loadError, setLoadError] = useState(false)
  const [hasMoreResults, setHasMoreResults] = useState(false)

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
    setHasMoreResults(false)
  }, [])

  const doSearch = useCallback((q: string, f: Filter) => {
    if (!isIndexReady() || !q.trim()) return

    if (f === 'topics') {
      setResults([])
      setHasMoreResults(false)
      const res = searchTopics(q)
      setTopicResults(res)
      setActiveIndex(res.length > 0 ? 0 : -1)
      return
    }

    setTopicResults([])
    const res = searchDocs(q, FILTER_FIELDS[f], MAX_RESULTS + 1)
    const visibleResults = res.slice(0, MAX_RESULTS)
    setResults(visibleResults)
    setHasMoreResults(res.length > MAX_RESULTS)
    setActiveIndex(visibleResults.length > 0 ? 0 : -1)
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
    setLoadError(false)
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
        setLoadError(true)
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
    if (f === 'topics') setResults([])
    else {
      setTopicResults([])
    }
    if (queryRef.current.trim()) doSearch(queryRef.current, f)
  }

  const activeListLength =
    filter === 'topics'
      ? topicResults.length + 1
      : results.length + (hasMoreResults ? 1 : 0)

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

      if (filter === 'topics') {
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
      } else if (hasMoreResults && idx === results.length) {
        router.push(`/search?q=${encodeURIComponent(queryRef.current.trim())}&filter=${filter}`)
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

  const tryAll = () => {
    setFilter('all')
    if (queryRef.current.trim()) doSearch(queryRef.current, 'all')
  }

  const viewAllResults = () => {
    const q = queryRef.current.trim()
    if (!q) return
    router.push(`/search?q=${encodeURIComponent(q)}&filter=${filter}`)
    close()
  }

  const hasQuery = query.trim() !== ''
  const showDropdown = overlayMode || (focused && hasQuery)
  const activeOptionId = activeIndex >= 0 && activeListLength > 0 ? `${RESULTS_ID}-option-${activeIndex}` : undefined

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
            <button className={styles.backButton} onClick={close} aria-label={uiText.search.close}>
              <BackIcon aria-hidden />
            </button>
          )}
          <div className={styles.inputField}>
            {loading ? (
              <span className={styles.spinner} aria-hidden />
            ) : (
              <SearchIcon className={styles.icon} aria-hidden />
            )}
            <input
              ref={inputRef}
              className={styles.input}
              type="text"
              role="combobox"
              aria-label={uiText.search.inputLabel}
              aria-autocomplete="list"
              aria-expanded={showDropdown}
              aria-controls={showDropdown ? RESULTS_ID : undefined}
              aria-activedescendant={activeOptionId}
              placeholder={placeholder}
              value={query}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              autoComplete="off"
              spellCheck={false}
            />
            {hasQuery && (
              <button className={styles.clear} onClick={handleClear} aria-label={uiText.search.clear}>
                <XIcon aria-hidden />
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
              resultsId={RESULTS_ID}
              filter={filter}
              query={query}
              hasQuery={hasQuery}
              results={results}
              topicResults={topicResults}
              activeIndex={activeIndex}
              hasMoreResults={hasMoreResults}
              loading={loading}
              loadError={loadError}
              onActiveChange={setActiveIndex}
              onClose={close}
              onTryAll={tryAll}
              onViewAllResults={viewAllResults}
              activeItemRef={activeItemRef}
            />
            <div className={styles.hint}>
              <span>{uiText.search.hints.move}</span>
              <span>{uiText.search.hints.changeFilter}</span>
              <span>{uiText.search.hints.open}</span>
              <span>{uiText.search.hints.close}</span>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

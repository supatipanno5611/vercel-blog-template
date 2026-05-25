'use client'

import Link from 'next/link'
import { getHighlightedSnippets, highlight } from '@/lib/highlight'
import type { SearchResult, TopicResult } from '@/lib/searchIndex'
import { uiText } from '@/lib/ui-text'
import styles from './SearchBox.module.css'

function getSearchTerms(result: SearchResult): string[] {
  return [...result.terms, ...result.queryTerms]
}

function getMatchedFields(result: SearchResult): Set<string> {
  return new Set(Object.values(result.match).flat())
}

function getFieldBadges(fields: Set<string>): string[] {
  const badges: string[] = []
  if (fields.has('title')) badges.push(uiText.search.fieldBadges.title)
  if (fields.has('body')) badges.push(uiText.search.fieldBadges.body)
  if (fields.has('audioTitle')) badges.push(uiText.search.fieldBadges.audioTitle)
  if (fields.has('topics')) badges.push(uiText.search.fieldBadges.topics)
  return badges
}

type Props = {
  resultsId: string
  filter: string
  query: string
  hasQuery: boolean
  results: SearchResult[]
  topicResults: TopicResult[]
  activeIndex: number
  hasMoreResults: boolean
  loading: boolean
  loadError: boolean
  onActiveChange: (i: number) => void
  onClose: () => void
  onTryAll: () => void
  onViewAllResults: () => void
  activeItemRef: React.RefObject<HTMLLIElement | null>
}

export default function SearchResults({
  resultsId,
  filter,
  query,
  hasQuery,
  results,
  topicResults,
  activeIndex,
  hasMoreResults,
  loading,
  loadError,
  onActiveChange,
  onClose,
  onTryAll,
  onViewAllResults,
  activeItemRef,
}: Props) {
  if (loading) {
    return (
      <ul id={resultsId} className={styles.results} role="listbox" aria-label={uiText.search.resultsLabel}>
        <li className={styles.guide} role="status">
          {uiText.search.loading}
        </li>
      </ul>
    )
  }

  if (loadError) {
    return (
      <ul id={resultsId} className={styles.results} role="listbox" aria-label={uiText.search.resultsLabel}>
        <li className={styles.empty} role="status">
          {uiText.search.loadError}
        </li>
      </ul>
    )
  }

  return (
    <ul id={resultsId} className={styles.results} role="listbox" aria-label={uiText.search.resultsLabel}>
      {filter === 'topics' ? (
        <>
          {hasQuery &&
            topicResults.map((result, i) => {
              const isActive = i === activeIndex
              return (
                <li
                  key={result.name}
                  id={`${resultsId}-option-${i}`}
                  ref={isActive ? activeItemRef : null}
                  className={isActive ? styles.active : undefined}
                  role="option"
                  aria-selected={isActive}
                  onMouseEnter={() => onActiveChange(i)}
                >
                  <Link href={result.url} onClick={onClose}>
                    <span className={styles.title}>{highlight(result.name, query, styles.mark)}</span>
                    <span className={styles.topicCount}>{uiText.common.postCount(result.count)}</span>
                  </Link>
                </li>
              )
            })}
          <li
            id={`${resultsId}-option-${topicResults.length}`}
            ref={topicResults.length === activeIndex ? activeItemRef : null}
            className={topicResults.length === activeIndex ? styles.active : undefined}
            role="option"
            aria-selected={topicResults.length === activeIndex}
            onMouseEnter={() => onActiveChange(topicResults.length)}
          >
            <Link href="/topics/search" onClick={onClose} className={styles.gotoTopicSearch}>
              {uiText.topic.browse}
            </Link>
          </li>
        </>
      ) : !hasQuery ? (
        <li className={styles.guide} role="status">
          {uiText.search.guide}
        </li>
      ) : results.length === 0 ? (
        <li className={styles.empty} role="status">
          <span>{uiText.search.noResults(query)}</span>
          {(filter === 'title' || filter === 'body') && (
            <button className={styles.emptyAction} onClick={onTryAll}>
              {uiText.search.tryAll}
            </button>
          )}
        </li>
      ) : (
        <>
          {results.map((result, i) => {
            const matchedFields = getMatchedFields(result)
            const searchTerms = getSearchTerms(result)
            const snippets = matchedFields.has('body')
              ? getHighlightedSnippets(result.body, query, searchTerms, { limit: 2 })
              : []
            const fieldBadges = getFieldBadges(matchedFields)
            const showAudioTitle = result.audioTitle && filter === 'all' && matchedFields.has('audioTitle')
            const isActive = i === activeIndex

            return (
              <li
                key={result.id}
                id={`${resultsId}-option-${i}`}
                ref={isActive ? activeItemRef : null}
                className={isActive ? styles.active : undefined}
                role="option"
                aria-selected={isActive}
                onMouseEnter={() => onActiveChange(i)}
              >
                <Link href={result.url} onClick={onClose}>
                  <span className={styles.resultHeader}>
                    <span className={styles.title}>{highlight(result.title, query, styles.mark, searchTerms)}</span>
                    {fieldBadges.length > 0 && (
                      <span className={styles.fieldBadges} aria-label={uiText.search.matchedIn(fieldBadges.join(', '))}>
                        {fieldBadges.map((badge) => (
                          <span key={badge} className={styles.fieldBadge}>
                            {badge}
                          </span>
                        ))}
                      </span>
                    )}
                  </span>
                  {showAudioTitle && (
                    <span className={styles.audioMeta}>
                      <span className={styles.audioMetaLabel}>{uiText.audio.label}</span>
                      <span>{highlight(result.audioTitle, query, styles.mark, searchTerms)}</span>
                    </span>
                  )}
                  {snippets.map((snippet) => (
                    <span key={snippet} className={styles.snippet}>
                      {highlight(snippet, query, styles.mark, searchTerms)}
                    </span>
                  ))}
                </Link>
              </li>
            )
          })}
          {hasMoreResults && (
            <li
              id={`${resultsId}-option-${results.length}`}
              ref={results.length === activeIndex ? activeItemRef : null}
              className={results.length === activeIndex ? styles.active : undefined}
              role="option"
              aria-selected={results.length === activeIndex}
              onMouseEnter={() => onActiveChange(results.length)}
            >
              <button className={styles.viewAllResult} onClick={onViewAllResults}>
                {uiText.search.viewAllResults(query)}
              </button>
            </li>
          )}
        </>
      )}
    </ul>
  )
}

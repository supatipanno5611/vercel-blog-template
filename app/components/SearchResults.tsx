'use client'

import Link from 'next/link'
import { getHighlightedSnippets, highlight } from '@/lib/highlight'
import { tagMatchesAnyTerm } from '@/lib/topic-match'
import type { SearchResult, TopicResult } from '@/lib/searchIndex'
import styles from './SearchBox.module.css'

function getSearchTerms(result: SearchResult): string[] {
  return [...result.terms, ...result.queryTerms]
}

function getMatchedFields(result: SearchResult): Set<string> {
  return new Set(Object.values(result.match).flat())
}

function getFieldBadges(fields: Set<string>): string[] {
  const badges: string[] = []
  if (fields.has('title')) badges.push('Title')
  if (fields.has('body')) badges.push('Body')
  if (fields.has('base')) badges.push('Topic')
  if (!badges.length && fields.has('choseong')) badges.push('Text')
  return badges
}

type Props = {
  filter: string
  query: string
  hasQuery: boolean
  results: SearchResult[]
  topicResults: TopicResult[]
  activeIndex: number
  onActiveChange: (i: number) => void
  onClose: () => void
  activeItemRef: React.RefObject<HTMLLIElement | null>
}

export default function SearchResults({
  filter,
  query,
  hasQuery,
  results,
  topicResults,
  activeIndex,
  onActiveChange,
  onClose,
  activeItemRef,
}: Props) {
  return (
    <ul className={styles.results}>
      {filter === 'base' ? (
        <>
          {hasQuery &&
            topicResults.map((result, i) => {
              const isActive = i === activeIndex
              return (
                <li
                  key={result.name}
                  ref={isActive ? activeItemRef : null}
                  className={isActive ? styles.active : undefined}
                  onMouseEnter={() => onActiveChange(i)}
                >
                  <Link href={result.url} onClick={onClose}>
                    <span className={styles.title}>{highlight(result.name, query, styles.mark)}</span>
                    <span className={styles.topicCount}>{result.count} posts</span>
                  </Link>
                </li>
              )
            })}
          <li
            ref={topicResults.length === activeIndex ? activeItemRef : null}
            className={topicResults.length === activeIndex ? styles.active : undefined}
            onMouseEnter={() => onActiveChange(topicResults.length)}
          >
            <Link href="/topics/search" onClick={onClose} className={styles.gotoTopicSearch}>
              Browse topics
            </Link>
          </li>
        </>
      ) : !hasQuery ? (
        <li className={styles.guide}>Search by title, body, or topic.</li>
      ) : results.length === 0 ? (
        <li className={styles.empty}>No results for &quot;{query}&quot;.</li>
      ) : (
        results.map((result, i) => {
          const matchedFields = getMatchedFields(result)
          const searchTerms = getSearchTerms(result)
          const snippets = matchedFields.has('body')
            ? getHighlightedSnippets(result.body, query, searchTerms, { limit: 2 })
            : []
          const fieldBadges = getFieldBadges(matchedFields)
          const showTags = result.tags.length > 0 && filter === 'all' && matchedFields.has('base')
          const isActive = i === activeIndex

          return (
            <li
              key={result.id}
              ref={isActive ? activeItemRef : null}
              className={isActive ? styles.active : undefined}
              onMouseEnter={() => onActiveChange(i)}
            >
              <Link href={result.url} onClick={onClose}>
                <span className={styles.resultHeader}>
                  <span className={styles.title}>{highlight(result.title, query, styles.mark, searchTerms)}</span>
                  {fieldBadges.length > 0 && (
                    <span className={styles.fieldBadges} aria-label={`Matched in ${fieldBadges.join(', ')}`}>
                      {fieldBadges.map((badge) => (
                        <span key={badge} className={styles.fieldBadge}>
                          {badge}
                        </span>
                      ))}
                    </span>
                  )}
                </span>
                {showTags && (
                  <span className={styles.tags}>
                    {result.tags.map((tag) => (
                      <span
                        key={tag}
                        className={tagMatchesAnyTerm(tag, query) ? styles.tagMatched : styles.tagOther}
                      >
                        {highlight(tag, query, styles.mark, searchTerms)}
                      </span>
                    ))}
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
        })
      )}
    </ul>
  )
}

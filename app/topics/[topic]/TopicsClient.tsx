'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { safeDecodeURIComponent } from '@/lib/safe-decode'
import { overlapCount, jaccard } from '@/lib/topics'
import TopicPicker from '@/app/components/TopicPicker'
import { useHideOnScroll } from '@/app/components/useHideOnScroll'
import { useSearchShortcut } from '@/app/components/hooks/useSearchShortcut'
import fabStyles from '@/app/components/Fab.module.css'
import { SearchIcon, XIcon } from '@/app/components/icons'
import searchFabStyles from '@/app/components/Search.module.css'
import styles from './page.module.css'

type PostSummary = {
  slugAsParams: string
  title: string
  base: string[]
}

type TopicInfo = { name: string; count: number }

type Props = {
  topic: string | null
  posts: PostSummary[]
  allTopics: TopicInfo[]
  curatedTopics: string[]
}

const TOPIC_PAGE_SIZE = 30

export default function TopicsClient({ topic, posts, allTopics, curatedTopics }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const extraTopics = Array.from(new Set(
    searchParams.get('with')
      ?.split(',')
      .map(safeDecodeURIComponent)
      .filter((value): value is string => Boolean(value)) ?? []
  ))
  const selected = Array.from(new Set(topic ? [topic, ...extraTopics] : extraTopics))
  const selectedKey = selected.join(',')

  const [pickerOpen, setPickerOpen] = useState(false)
  const [visibleState, setVisibleState] = useState({ key: selectedKey, count: 30 })
  const [visibleTopicCount, setVisibleTopicCount] = useState(TOPIC_PAGE_SIZE)
  const visibleCount = visibleState.key === selectedKey ? visibleState.count : 30
  const pickerVisible = useHideOnScroll()

  useSearchShortcut(useCallback(() => setPickerOpen(true), []))

  function buildUrl(newSelected: string[]): string {
    const [main, ...extras] = newSelected
    if (!main) return '/topics/search'
    const qs = extras.length ? `?with=${extras.map(encodeURIComponent).join(',')}` : ''
    return `/topics/${encodeURIComponent(main)}${qs}`
  }

  function addTopic(t: string) {
    router.push(buildUrl([...selected, t]))
  }

  function removeTopic(t: string) {
    router.push(buildUrl(selected.filter((s) => s !== t)))
  }

  function handleSingleSelect(t: string) {
    if (selected.includes(t)) removeTopic(t)
    else addTopic(t)
    setPickerOpen(false)
  }

  function handleToggleSelect(t: string) {
    if (selected.includes(t)) removeTopic(t)
    else addTopic(t)
  }

  function handleFallbackSearch(q: string) {
    setPickerOpen(false)
    window.dispatchEvent(new CustomEvent('open-global-search', { detail: { query: q } }))
  }

  const andResults = selected.length === 0 ? [] : posts.filter((p) => selected.every((t) => p.base.includes(t)))
  const usedFallback = andResults.length === 0 && selected.length > 1
  const filtered = usedFallback ? posts.filter((p) => selected.some((t) => p.base.includes(t))) : andResults
  const sorted = filtered
    .map((p) => ({ p, overlap: overlapCount(p.base, selected), sim: jaccard(p.base, selected) }))
    .sort((a, b) => b.overlap - a.overlap || b.sim - a.sim)
    .map((x) => x.p)
  const suggestedTopics = curatedTopics.length > 0 ? curatedTopics : allTopics.map((topicInfo) => topicInfo.name)
  const visibleSuggestedTopics = suggestedTopics.slice(0, visibleTopicCount)
  const hasMoreSuggestedTopics = suggestedTopics.length > visibleTopicCount

  return (
    <main className={styles.main}>
      <button
        className={`${fabStyles.fab} ${searchFabStyles.search} ${pickerVisible ? '' : fabStyles.fabHidden}`}
        onClick={() => setPickerOpen(true)}
        aria-label="주제어 검색 열기"
        title="주제어 검색 (Ctrl+K)"
      >
        <SearchIcon aria-hidden />
      </button>

      <TopicPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        allTopics={allTopics}
        selected={selected}
        onSingleSelect={handleSingleSelect}
        onToggleSelect={handleToggleSelect}
        onFallbackSearch={handleFallbackSearch}
      />

      {selected.length > 0 && (
        <div className={styles.header}>
          <div className={styles.chips}>
            {selected.map((t, i) => (
              <span key={t} className={`${styles.chip} ${i === 0 ? styles.chipMain : styles.chipExtra}`}>
                {t}
                <button className={styles.chipRemove} onClick={() => removeTopic(t)} aria-label={`${t} 제거`}>
                  <XIcon aria-hidden />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {selected.length === 0 && suggestedTopics.length > 0 && (
        <div className={styles.emptyState}>
          <p className={styles.emptyHint}>{curatedTopics.length > 0 ? '추천 주제어' : '주제어 둘러보기'}</p>
          <div className={styles.recommendList}>
            {visibleSuggestedTopics.map((name) => {
              const info = allTopics.find((topicInfo) => topicInfo.name === name)
              return (
                <button key={name} className={styles.recommendChip} onClick={() => addTopic(name)}>
                  {name}
                  {info && <span className={styles.recommendCount}>{info.count}개의 글</span>}
                </button>
              )
            })}
          </div>
          {hasMoreSuggestedTopics && (
            <button className={styles.moreBtn} onClick={() => setVisibleTopicCount(visibleTopicCount + TOPIC_PAGE_SIZE)}>
              더 보기
            </button>
          )}
        </div>
      )}

      {selected.length === 0 && suggestedTopics.length === 0 && <p className={styles.emptyHint}>둘러볼 주제어를 선택해 주세요.</p>}

      {selected.length > 0 && sorted.length === 0 && (
        <p className={styles.empty}>
          이 주제어 조합에 맞는 글이 없어요.{' '}
          <button className={styles.resetBtn} onClick={() => router.push('/topics/search')}>
            검색 초기화
          </button>
        </p>
      )}

      {selected.length > 0 && sorted.length > 0 && (
        <>
          {usedFallback && <p className={styles.fallbackNotice}>정확히 일치하는 글이 없어 관련 글을 보여줍니다.</p>}
          <p className={styles.count}>{sorted.length}개의 글</p>
          <ul className={styles.list}>
            {sorted.slice(0, visibleCount).map((p) => (
              <li key={p.slugAsParams}>
                <a href={`/${p.slugAsParams}`} className={styles.item}>
                  {p.title}
                </a>
              </li>
            ))}
          </ul>
          {sorted.length > visibleCount && (
            <button
              className={styles.moreBtn}
              onClick={() => setVisibleState({ key: selectedKey, count: visibleCount + 30 })}
            >
              더 보기
            </button>
          )}
        </>
      )}
    </main>
  )
}

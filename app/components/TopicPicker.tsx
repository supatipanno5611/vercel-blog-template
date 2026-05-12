'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { highlight } from '@/lib/highlight'
import { topicIncludesQuery } from '@/lib/topic-match'
import searchStyles from './SearchBox.module.css'
import { BackIcon, CheckIcon, SearchIcon, XIcon } from './icons'
import styles from './TopicPicker.module.css'

type TopicInfo = { name: string; count: number }

const noopSubscribe = () => () => {}

type Props = {
  open: boolean
  onClose: () => void
  allTopics: TopicInfo[]
  selected: string[]
  onSingleSelect: (topic: string) => void
  onToggleSelect: (topic: string) => void
  onFallbackSearch: (query: string) => void
}

export default function TopicPicker({
  open,
  onClose,
  allTopics,
  selected,
  onSingleSelect,
  onToggleSelect,
  onFallbackSearch,
}: Props) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const activeItemRef = useRef<HTMLLIElement | null>(null)
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false)

  const filtered = allTopics.filter((topic) => topicIncludesQuery(topic.name, query))
  const showFallback = query.trim() !== '' && filtered.length === 0
  const listLength = showFallback ? 1 : filtered.length

  const close = () => {
    setQuery('')
    setActiveIndex(0)
    onClose()
  }

  useEffect(() => {
    activeItemRef.current?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  useEffect(() => {
    if (!open) return

    inputRef.current?.focus()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, listLength - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (showFallback) {
        setQuery('')
        setActiveIndex(0)
        onFallbackSearch(query)
        return
      }

      const topic = filtered[activeIndex]
      if (!topic) return
      if (e.ctrlKey) {
        onToggleSelect(topic.name)
        setQuery('')
        setActiveIndex(0)
      } else {
        setQuery('')
        setActiveIndex(0)
        onSingleSelect(topic.name)
      }
    } else if (e.key === 'Backspace' && query === '' && selected.length > 0) {
      e.preventDefault()
      onToggleSelect(selected[selected.length - 1])
    } else if (e.key === 'Escape') {
      close()
    }
  }

  if (!open) return null

  return (
    <>
      {mounted && createPortal(<div className={searchStyles.overlayBackdrop} onClick={close} />, document.body)}
      <div className={`${searchStyles.container} ${searchStyles.overlayContainer}`} role="dialog" aria-modal="true" aria-label="주제어 검색">
        <div className={searchStyles.inputWrap}>
          <button className={searchStyles.backButton} onClick={close} aria-label="주제어 검색 닫기">
            <BackIcon aria-hidden />
          </button>
          <div className={searchStyles.inputField}>
            <SearchIcon className={searchStyles.icon} aria-hidden />
            <input
              ref={inputRef}
              className={searchStyles.input}
              type="text"
              placeholder="주제어 찾기"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setActiveIndex(0)
              }}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              spellCheck={false}
              aria-autocomplete="list"
            />
            {query && (
              <button
                className={searchStyles.clear}
                onClick={() => {
                  setQuery('')
                  setActiveIndex(0)
                  inputRef.current?.focus()
                }}
                aria-label="주제어 검색어 지우기"
              >
                <XIcon aria-hidden />
              </button>
            )}
          </div>
        </div>
        <div className={`${searchStyles.dropdown} ${searchStyles.overlayDropdown}`} onMouseDown={(e) => e.preventDefault()}>
          <ul className={searchStyles.results} role="listbox">
            {showFallback ? (
              <li ref={activeItemRef} className={styles.fallbackRow}>
                <button className={styles.fallbackBtn} onClick={() => onFallbackSearch(query)}>
                  <span className={searchStyles.title}>
                    일치하는 주제어가 없어요. 글에서 &quot;{query}&quot; 검색
                  </span>
                </button>
              </li>
            ) : (
              filtered.map((topic, i) => {
                const isActive = i === activeIndex
                const isSelected = selected.includes(topic.name)
                return (
                  <li
                    key={topic.name}
                    ref={isActive ? activeItemRef : null}
                    className={`${isActive ? styles.activeRow : ''} ${isSelected ? styles.rowSelected : ''}`}
                    role="option"
                    aria-selected={isActive}
                    aria-checked={isSelected}
                    onMouseEnter={() => setActiveIndex(i)}
                  >
                    <button className={styles.topicRow} onClick={() => onToggleSelect(topic.name)}>
                      <span className={searchStyles.title}>{highlight(topic.name, query, searchStyles.mark)}</span>
                      <span className={styles.meta}>
                        {isSelected && <CheckIcon className={styles.checkIcon} aria-hidden />}
                        <span className={searchStyles.topicCount}>{topic.count}개의 글</span>
                      </span>
                    </button>
                  </li>
                )
              })
            )}
          </ul>
          <div className={searchStyles.hint}>
            <span>방향키 이동</span>
            <span>Enter로 선택</span>
            <span>Ctrl+Enter로 계속 선택</span>
            <span>Esc로 닫기</span>
          </div>
        </div>
      </div>
    </>
  )
}

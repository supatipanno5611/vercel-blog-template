'use client'

import { useEffect, useId, useRef } from 'react'
import { uiText } from '@/lib/ui-text'
import { scrollStartBelowHeader, useCue } from './CueProvider'
import styles from './Chapter.module.css'

type Props = {
  time: string
  label: string
  title: string
}

export default function Chapter({ time, label, title }: Props) {
  const id = useId()
  const ref = useRef<HTMLDivElement>(null)
  const ctx = useCue()
  const registerChapter = ctx?.registerChapter
  const unregisterChapter = ctx?.unregisterChapter
  const seconds = Number(time) || 0

  useEffect(() => {
    if (!registerChapter || !unregisterChapter || !ref.current) return
    registerChapter(id, seconds, label, title, ref.current)
    return () => unregisterChapter(id)
  }, [id, seconds, label, title, registerChapter, unregisterChapter])

  const isActive = ctx?.activeChapterId === id

  return (
    <div ref={ref} className={`${styles.chapter} ${isActive ? styles.active : ''}`}>
      <div className={styles.line} />
      <button
        type="button"
        className={styles.chip}
        onClick={() => {
            ctx?.jump(seconds)
            if (ref.current) scrollStartBelowHeader(ref.current)
          }}
        aria-label={uiText.chapter.jumpTo(label, title)}
      >
        <span className={styles.label}>{label}</span>
        <span className={styles.title}>{title}</span>
      </button>
      <div className={styles.line} />
    </div>
  )
}

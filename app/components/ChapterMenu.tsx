'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { uiText } from '@/lib/ui-text'
import { scrollStartBelowHeader, useCue } from './CueProvider'
import { useClickOutside } from './hooks/useClickOutside'
import { ListIcon } from './icons'
import styles from './ChapterMenu.module.css'

export default function ChapterMenu() {
  const ctx = useCue()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  const chapters = ctx?.chapters ?? []

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  useClickOutside(wrapRef, useCallback(() => setOpen(false), []), open)

  if (chapters.length === 0) return null

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <button
        type="button"
        className={`${styles.btn} ${open ? styles.btnActive : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={uiText.chapter.list}
        aria-expanded={open}
      >
        <ListIcon aria-hidden />
      </button>
      {open && (
        <div className={styles.dropdown} role="menu">
          {chapters.map((ch) => (
            <button
              key={ch.id}
              type="button"
              role="menuitem"
              className={`${styles.item} ${ctx?.activeChapterId === ch.id ? styles.itemActive : ''}`}
              onClick={() => {
                ctx?.jump(ch.time)
                scrollStartBelowHeader(ch.el)
                setOpen(false)
              }}
            >
              <span className={styles.itemLabel}>{ch.label}</span>
              <span className={styles.itemTitle}>{ch.title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

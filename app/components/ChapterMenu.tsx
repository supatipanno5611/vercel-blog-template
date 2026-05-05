'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useCue } from './CueProvider'
import { useClickOutside } from './hooks/useClickOutside'
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
        aria-label="챕터 목록"
        aria-expanded={open}
      >
        <svg viewBox="0 0 20 20" fill="none" aria-hidden>
          <rect x="4" y="5" width="12" height="1.5" rx="0.75" fill="currentColor" />
          <rect x="4" y="9.25" width="12" height="1.5" rx="0.75" fill="currentColor" />
          <rect x="4" y="13.5" width="8" height="1.5" rx="0.75" fill="currentColor" />
        </svg>
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
                ch.el.scrollIntoView({ behavior: 'smooth', block: 'center' })
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

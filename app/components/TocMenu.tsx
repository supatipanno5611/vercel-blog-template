'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { TocItem } from '@/lib/heading-toc'
import { scrollStartBelowHeader } from './CueProvider'
import { useClickOutside } from './hooks/useClickOutside'
import styles from './TocMenu.module.css'

type Props = {
  items?: TocItem[]
}

export default function TocMenu({ items = [] }: Props) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  useClickOutside(wrapRef, useCallback(() => setOpen(false), []), open)

  if (items.length < 2) return null

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <button
        type="button"
        className={`${styles.btn} ${open ? styles.btnActive : ''}`}
        onClick={() => setOpen((value) => !value)}
        aria-label="본문 목차"
        aria-expanded={open}
        title="본문 목차"
      >
        <svg viewBox="0 0 20 20" fill="none" aria-hidden>
          <path d="M5 5.75h10M5 10h10M5 14.25h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="3" cy="5.75" r="0.8" fill="currentColor" />
          <circle cx="3" cy="10" r="0.8" fill="currentColor" />
          <circle cx="3" cy="14.25" r="0.8" fill="currentColor" />
        </svg>
      </button>
      {open && (
        <div className={styles.dropdown} role="menu">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              className={styles.item}
              data-depth={item.depth}
              onClick={() => {
                const el = document.getElementById(item.id)
                if (el) {
                  scrollStartBelowHeader(el)
                  window.history.replaceState(null, '', `${window.location.pathname}#${item.id}`)
                }
                setOpen(false)
              }}
            >
              {item.title}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

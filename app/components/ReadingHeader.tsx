'use client'

import { useState, useEffect, useRef, Suspense, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import SearchBox from './SearchBox'
import ScrollProgress from './ScrollProgress'
import styles from './ReadingHeader.module.css'

function SearchBoxWithParams({ onClose }: { onClose: () => void }) {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('q') ?? ''
  return <SearchBox overlayMode initialQuery={initialQuery} onClose={onClose} />
}

type Props = {
  title?: string
}

export default function ReadingHeader({ title }: Props) {
  const [visible, setVisible] = useState(true)
  const [searchOpen, setSearchOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const lastY = useRef(0)

  const handleShare = useCallback(async () => {
    const url = window.location.href
    if (navigator.share) {
      try { await navigator.share({ url }) } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [])

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      if (Math.abs(y - lastY.current) < 5) return
      setVisible(y < lastY.current || y < 50)
      lastY.current = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || !e.ctrlKey) return
      const tag = (document.activeElement as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      e.preventDefault()
      setSearchOpen(true)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <ScrollProgress />
      <header className={styles.header}>
        {title && <span className={styles.pageTitle}>{title}</span>}
      </header>
      <button
        className={`${styles.fab} ${styles.fabShare} ${visible ? '' : styles.fabHidden}`}
        onClick={handleShare}
        aria-label="링크 공유"
        title="링크 공유"
      >
        {copied ? (
          <svg viewBox="0 0 20 20" fill="none" aria-hidden>
            <polyline points="4,10 8,14 16,6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 20 20" fill="none" aria-hidden>
            <path d="M10 3v10M6 7l4-4 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M5 11v4a1 1 0 001 1h8a1 1 0 001-1v-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        )}
      </button>
      <button
        className={`${styles.fab} ${visible ? '' : styles.fabHidden}`}
        onClick={() => setSearchOpen(true)}
        aria-label="검색"
        title="검색  (Ctrl+/)"
      >
        <svg viewBox="0 0 20 20" fill="none" aria-hidden>
          <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.6" />
          <line x1="12.5" y1="12.5" x2="17" y2="17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
      {searchOpen && (
        <Suspense>
          <SearchBoxWithParams onClose={() => setSearchOpen(false)} />
        </Suspense>
      )}
    </>
  )
}

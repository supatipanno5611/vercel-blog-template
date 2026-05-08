'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import SearchBox from './SearchBox'
import { useHideOnScroll } from './useHideOnScroll'
import { useSearchShortcut } from './hooks/useSearchShortcut'
import fabStyles from './Fab.module.css'
import styles from './Search.module.css'

export default function Search() {
  const pathname = usePathname()
  const isTopicRoute = pathname.startsWith('/topics')
  const visible = useHideOnScroll()
  const [open, setOpen] = useState(false)
  const [initialQuery, setInitialQuery] = useState<string | undefined>()

  useSearchShortcut(
    useCallback(() => {
      setInitialQuery(undefined)
      setOpen(true)
    }, []),
    !isTopicRoute
  )

  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<{ query?: string }>).detail
      setInitialQuery(detail?.query)
      setOpen(true)
    }

    window.addEventListener('open-global-search', onOpen)
    return () => window.removeEventListener('open-global-search', onOpen)
  }, [])

  const openSearch = () => {
    setInitialQuery(undefined)
    setOpen(true)
  }

  const closeSearch = () => {
    setOpen(false)
    setInitialQuery(undefined)
  }

  if (isTopicRoute && !open) return null

  return (
    <>
      {!isTopicRoute && (
        <button
          className={`${fabStyles.fab} ${styles.search} ${visible ? '' : fabStyles.fabHidden}`}
          onClick={openSearch}
          aria-label="Open search"
          title="Search (Ctrl+K)"
        >
          <svg viewBox="0 0 20 20" fill="none" aria-hidden>
            <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.6" />
            <line x1="12.5" y1="12.5" x2="17" y2="17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      )}
      {open && <SearchBox overlayMode initialQuery={initialQuery} onClose={closeSearch} />}
    </>
  )
}

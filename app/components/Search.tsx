'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { uiText } from '@/lib/ui-text'
import SearchBox from './SearchBox'
import { useHideOnScroll } from './useHideOnScroll'
import { useSearchShortcut } from './hooks/useSearchShortcut'
import fabStyles from './Fab.module.css'
import { SearchIcon } from './icons'
import styles from './Search.module.css'

export default function Search() {
  const pathname = usePathname()
  const isTopicRoute = pathname.startsWith('/topics')
  const showFab = pathname === '/'
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

  if (!showFab && !open) return null

  return (
    <>
      {showFab && (
        <button
          className={`${fabStyles.fab} ${styles.search} ${visible ? '' : fabStyles.fabHidden}`}
          onClick={openSearch}
          aria-label={uiText.search.open}
          title={uiText.search.openWithShortcut}
        >
          <SearchIcon aria-hidden />
        </button>
      )}
      {open && <SearchBox overlayMode initialQuery={initialQuery} onClose={closeSearch} />}
    </>
  )
}

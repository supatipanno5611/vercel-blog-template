'use client'

import { useEffect } from 'react'

export function useSearchShortcut(callback: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'k' || (!e.ctrlKey && !e.metaKey)) return
      const tag = (document.activeElement as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      e.preventDefault()
      callback()
    }

    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [callback, enabled])
}

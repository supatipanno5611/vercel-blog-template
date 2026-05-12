'use client'

import { useState, useCallback } from 'react'
import { uiText } from '@/lib/ui-text'
import { useHideOnScroll } from './useHideOnScroll'
import fabStyles from './Fab.module.css'
import { CheckIcon, ShareIcon } from './icons'
import styles from './ShareFab.module.css'

export default function ShareFab() {
  const visible = useHideOnScroll()
  const [copied, setCopied] = useState(false)

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

  return (
    <button
      className={`${fabStyles.fab} ${styles.share} ${visible ? '' : fabStyles.fabHidden}`}
      onClick={handleShare}
      aria-label={uiText.share.label}
      title={uiText.share.label}
    >
      {copied ? <CheckIcon aria-hidden /> : <ShareIcon aria-hidden />}
    </button>
  )
}

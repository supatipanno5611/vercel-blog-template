'use client'

import { useEffect, useState } from 'react'
import type { TocItem } from '@/lib/heading-toc'
import ChapterMenu from './ChapterMenu'
import TocMenu from './TocMenu'
import styles from './Header.module.css'

type Props = {
  title?: string
  showAudioRepeat?: boolean
  tocItems?: TocItem[]
}

export default function Header({ title, showAudioRepeat, tocItems }: Props) {
  const [loop, setLoop] = useState(false)

  useEffect(() => {
    if (!showAudioRepeat) return
    const audio = document.querySelector('audio')
    if (!audio) return
    audio.loop = loop
  }, [loop, showAudioRepeat])

  return (
    <header className={styles.header}>
      {title && <span className={styles.pageTitle}>{title}</span>}
      <div className={styles.rightControls}>
        <TocMenu items={tocItems} />
        <ChapterMenu />
        {showAudioRepeat && (
          <button
            type="button"
            className={`${styles.repeatToggle} ${loop ? styles.repeatOn : ''}`}
            onClick={() => setLoop((value) => !value)}
            aria-label={loop ? 'Disable repeat' : 'Enable repeat'}
            aria-pressed={loop}
            title={loop ? 'Disable repeat' : 'Enable repeat'}
          >
            <svg viewBox="0 0 20 20" fill="none" aria-hidden>
              <path
                d="M5 8V7a2 2 0 012-2h7l-2-2M15 12v1a2 2 0 01-2 2H6l2 2"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>
    </header>
  )
}

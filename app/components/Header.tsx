'use client'

import { useEffect, useState } from 'react'
import type { TocItem } from '@/lib/heading-toc'
import { uiText } from '@/lib/ui-text'
import ChapterMenu from './ChapterMenu'
import { RepeatIcon } from './icons'
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
            aria-label={loop ? uiText.audio.repeatOff : uiText.audio.repeatOn}
            aria-pressed={loop}
            title={loop ? uiText.audio.repeatOff : uiText.audio.repeatOn}
          >
            <RepeatIcon aria-hidden />
          </button>
        )}
      </div>
    </header>
  )
}

'use client'

import { useEffect, useState } from 'react'
import type { TocItem } from '@/lib/heading-toc'
import { uiText } from '@/lib/ui-text'
import ChapterMenu from './ChapterMenu'
import { MaximizeIcon, MinimizeIcon, RepeatIcon } from './icons'
import TocMenu from './TocMenu'
import styles from './Header.module.css'

type Props = {
  title?: string
  showChapterMenu?: boolean
  showAudioRepeat?: boolean
  tocItems?: TocItem[]
}

export default function Header({ title, showChapterMenu, showAudioRepeat, tocItems }: Props) {
  const [loop, setLoop] = useState(false)
  const [fullscreenSupported, setFullscreenSupported] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)

  useEffect(() => {
    if (!showAudioRepeat) return
    const audio = document.querySelector('audio')
    if (!audio) return
    audio.loop = loop
  }, [loop, showAudioRepeat])

  useEffect(() => {
    setFullscreenSupported(Boolean(document.fullscreenEnabled && document.documentElement.requestFullscreen))

    const onFullscreenChange = () => {
      setFullscreen(Boolean(document.fullscreenElement))
    }

    onFullscreenChange()
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await document.documentElement.requestFullscreen({ navigationUI: 'hide' })
      }
    } catch {
      setFullscreen(Boolean(document.fullscreenElement))
    }
  }

  return (
    <header className={styles.header}>
      {title && <span className={styles.pageTitle}>{title}</span>}
      <div className={styles.rightControls}>
        <TocMenu items={tocItems} />
        {showChapterMenu && <ChapterMenu />}
        {showAudioRepeat && (
          <button
            type="button"
            className={`${styles.headerButton} ${loop ? styles.headerButtonOn : ''}`}
            onClick={() => setLoop((value) => !value)}
            aria-label={loop ? uiText.audio.repeatOff : uiText.audio.repeatOn}
            aria-pressed={loop}
            title={loop ? uiText.audio.repeatOff : uiText.audio.repeatOn}
          >
            <RepeatIcon aria-hidden />
          </button>
        )}
        {fullscreenSupported && (
          <button
            type="button"
            className={`${styles.headerButton} ${fullscreen ? styles.headerButtonOn : ''}`}
            onClick={toggleFullscreen}
            aria-label={fullscreen ? uiText.fullscreen.exit : uiText.fullscreen.enter}
            aria-pressed={fullscreen}
            title={fullscreen ? uiText.fullscreen.exit : uiText.fullscreen.enter}
          >
            {fullscreen ? <MinimizeIcon aria-hidden /> : <MaximizeIcon aria-hidden />}
          </button>
        )}
      </div>
    </header>
  )
}

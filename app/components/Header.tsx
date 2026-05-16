'use client'

import { useEffect, useState } from 'react'
import type { TocItem } from '@/lib/heading-toc'
import { uiText } from '@/lib/ui-text'
import ChapterMenu from './ChapterMenu'
import { MaximizeIcon, RepeatIcon, TextSizeIcon } from './icons'
import TocMenu from './TocMenu'
import styles from './Header.module.css'

const LARGE_TEXT_STORAGE_KEY = 'blog-large-text'

type Props = {
  title?: string
  showChapterMenu?: boolean
  showAudioRepeat?: boolean
  tocItems?: TocItem[]
}

export default function Header({ title, showChapterMenu, showAudioRepeat, tocItems }: Props) {
  const [largeText, setLargeText] = useState(false)
  const [loop, setLoop] = useState(false)
  const [fullscreenSupported, setFullscreenSupported] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLargeText(document.documentElement.dataset.largeText === 'true')
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!showAudioRepeat) return
    const audio = document.querySelector('audio')
    if (!audio) return
    audio.loop = loop
  }, [loop, showAudioRepeat])

  useEffect(() => {
    const onFullscreenChange = () => {
      setFullscreen(Boolean(document.fullscreenElement))
    }

    const timer = window.setTimeout(() => {
      setFullscreenSupported(Boolean(document.fullscreenEnabled && document.documentElement.requestFullscreen))
      onFullscreenChange()
    }, 0)

    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('fullscreenchange', onFullscreenChange)
    }
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

  const toggleLargeText = () => {
    setLargeText((value) => {
      const next = !value

      if (next) {
        document.documentElement.dataset.largeText = 'true'
        try {
          localStorage.setItem(LARGE_TEXT_STORAGE_KEY, 'true')
        } catch {}
      } else {
        delete document.documentElement.dataset.largeText
        try {
          localStorage.removeItem(LARGE_TEXT_STORAGE_KEY)
        } catch {}
      }

      return next
    })
  }

  return (
    <header className={styles.header}>
      {title && <span className={styles.pageTitle}>{title}</span>}
      <div className={styles.leftControls}>
        <button
          type="button"
          className={`${styles.headerButton} ${largeText ? styles.headerButtonOn : ''}`}
          onClick={toggleLargeText}
          aria-label={largeText ? uiText.textSize.reset : uiText.textSize.increase}
          aria-pressed={largeText}
          title={largeText ? uiText.textSize.reset : uiText.textSize.increase}
        >
          <TextSizeIcon aria-hidden />
        </button>
      </div>
      <div className={styles.rightControls}>
        {fullscreenSupported && (
          <button
            type="button"
            className={`${styles.headerButton} ${fullscreen ? styles.headerButtonOn : ''}`}
            onClick={toggleFullscreen}
            aria-label={fullscreen ? uiText.fullscreen.exit : uiText.fullscreen.enter}
            aria-pressed={fullscreen}
            title={fullscreen ? uiText.fullscreen.exit : uiText.fullscreen.enter}
          >
            <MaximizeIcon aria-hidden />
          </button>
        )}
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
      </div>
    </header>
  )
}

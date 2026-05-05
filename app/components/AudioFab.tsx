'use client'

import { useEffect, useRef, useState } from 'react'
import fabStyles from './Fab.module.css'
import styles from './AudioFab.module.css'

type State = 'ready' | 'playing'

export default function AudioFab() {
  const [state, setState] = useState<State>('ready')
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const audio = document.querySelector('audio')
    if (!audio) return
    audioRef.current = audio
    const syncState = () => setState(audio.paused ? 'ready' : 'playing')
    audio.addEventListener('play', syncState)
    audio.addEventListener('pause', syncState)
    audio.addEventListener('ended', syncState)
    queueMicrotask(syncState)
    return () => {
      audio.removeEventListener('play', syncState)
      audio.removeEventListener('pause', syncState)
      audio.removeEventListener('ended', syncState)
    }
  }, [])

  const onClick = () => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) audio.play()
    else audio.pause()
  }

  const label = state === 'playing' ? '일시정지' : '재생'

  return (
    <button
      className={`${fabStyles.fab} ${styles.audio}`}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {state === 'ready' && (
        <svg viewBox="0 0 20 20" fill="none" aria-hidden>
          <polygon points="6,4 16,10 6,16" fill="currentColor" />
        </svg>
      )}
      {state === 'playing' && (
        <svg viewBox="0 0 20 20" fill="none" aria-hidden>
          <rect x="6" y="5" width="2.5" height="10" fill="currentColor" />
          <rect x="11.5" y="5" width="2.5" height="10" fill="currentColor" />
        </svg>
      )}
    </button>
  )
}

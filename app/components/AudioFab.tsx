'use client'

import { useEffect, useRef, useState } from 'react'
import { uiText } from '@/lib/ui-text'
import fabStyles from './Fab.module.css'
import { PauseIcon, PlayIcon } from './icons'
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

  const label = state === 'playing' ? uiText.audio.pause : uiText.audio.play

  return (
    <button
      className={`${fabStyles.fab} ${styles.audio}`}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {state === 'ready' && <PlayIcon aria-hidden />}
      {state === 'playing' && <PauseIcon aria-hidden />}
    </button>
  )
}

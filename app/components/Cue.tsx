'use client'

import { useEffect, useId, useRef } from 'react'
import { uiText } from '@/lib/ui-text'
import { scrollStartBelowHeader, useCue } from './CueProvider'
import { PlayIcon } from './icons'
import styles from './Cue.module.css'

type Props = {
  time: string
  label: string
  children: React.ReactNode
}

export default function Cue({ time, label, children }: Props) {
  const id = useId()
  const ref = useRef<HTMLDivElement>(null)
  const ctx = useCue()
  const registerCue = ctx?.registerCue
  const unregisterCue = ctx?.unregisterCue
  const seconds = Number(time) || 0

  useEffect(() => {
    if (!registerCue || !unregisterCue || !ref.current) return
    registerCue(id, seconds, ref.current)
    return () => unregisterCue(id)
  }, [id, seconds, registerCue, unregisterCue])

  const isActive = ctx?.activeCueId === id

  return (
    <div ref={ref} className={`${styles.cue} ${isActive ? styles.active : ''}`}>
      <div className={styles.chipRow}>
        <button
          type="button"
          className={styles.chip}
          onClick={() => {
            ctx?.jump(seconds)
            if (ref.current) scrollStartBelowHeader(ref.current)
          }}
          aria-label={uiText.cue.jumpTo(label)}
        >
          <PlayIcon aria-hidden />
          <span>{label}</span>
        </button>
      </div>
      {children}
    </div>
  )
}

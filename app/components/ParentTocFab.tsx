'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ParentToc } from '@/lib/parent-toc'
import { uiText } from '@/lib/ui-text'
import fabStyles from './Fab.module.css'
import { BookOpenIcon, XIcon } from './icons'
import { useClickOutside } from './hooks/useClickOutside'
import { useHideOnScroll } from './useHideOnScroll'
import styles from './ParentTocFab.module.css'

type Props = {
  toc: ParentToc
  currentSlug: string
}

export default function ParentTocFab({ toc, currentSlug }: Props) {
  const visible = useHideOnScroll()
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  useClickOutside(panelRef, useCallback(() => setOpen(false), []), open)

  return (
    <>
      <button
        className={`${fabStyles.fab} ${styles.fab} ${visible ? '' : fabStyles.fabHidden}`}
        onClick={() => setOpen(true)}
        aria-label={uiText.parentToc.label}
        title={uiText.parentToc.label}
      >
        <BookOpenIcon aria-hidden />
      </button>
      {open && (
        <>
          <div className={styles.backdrop} />
          <div ref={panelRef} className={styles.panel} role="dialog" aria-modal="true" aria-label={uiText.parentToc.label}>
            <div className={styles.header}>
              <div className={styles.heading}>
                <p className={styles.eyebrow}>{uiText.parentToc.label}</p>
                <Link href={`/${toc.index.slugAsParams}`} className={styles.indexLink} onClick={() => setOpen(false)}>
                  {toc.index.title}
                </Link>
              </div>
              <button className={styles.close} type="button" onClick={() => setOpen(false)} aria-label={uiText.search.close}>
                <XIcon aria-hidden />
              </button>
            </div>
            <Link href={`/${toc.index.slugAsParams}`} className={styles.openIndex} onClick={() => setOpen(false)}>
              {uiText.parentToc.indexLink}
            </Link>
            {toc.items.length > 0 ? (
              <ul className={styles.list}>
                {toc.items.map((item) => {
                  const current = item.slugAsParams === currentSlug
                  return (
                    <li key={item.slugAsParams}>
                      <Link
                        href={`/${item.slugAsParams}`}
                        className={`${styles.item} ${current ? styles.current : ''}`}
                        aria-current={current ? 'page' : undefined}
                        onClick={() => setOpen(false)}
                      >
                        <span>{item.title}</span>
                        {current && <span className={styles.currentLabel}>{uiText.parentToc.current}</span>}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className={styles.empty}>{uiText.parentToc.empty}</p>
            )}
          </div>
        </>
      )}
    </>
  )
}

'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { todayOrdinaryHref } from '@/lib/ordinary'
import { uiText } from '@/lib/ui-text'

export default function TodayOrdinaryLink({ className }: { className?: string }) {
  const [href, setHref] = useState('/ordinary')

  useEffect(() => {
    const timer = window.setTimeout(() => setHref(todayOrdinaryHref()), 0)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <Link href={href} className={className}>
      {uiText.nav.todayOrdinary} →
    </Link>
  )
}

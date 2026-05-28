import { notFound, redirect } from 'next/navigation'
import { monthFromDate, todayInOrdinaryTimeZone } from '@/lib/ordinary'
import { siteConfig } from '@/site.config'

export const dynamic = 'force-dynamic'

export default function OrdinaryPage() {
  if (!siteConfig.enableOrdinaryNotes) notFound()
  redirect(`/ordinary/${monthFromDate(todayInOrdinaryTimeZone())}`)
}

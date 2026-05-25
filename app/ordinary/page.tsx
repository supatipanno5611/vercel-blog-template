import { redirect } from 'next/navigation'
import { monthFromDate, todayInOrdinaryTimeZone } from '@/lib/ordinary'

export const dynamic = 'force-dynamic'

export default function OrdinaryPage() {
  redirect(`/ordinary/${monthFromDate(todayInOrdinaryTimeZone())}`)
}

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { posts } from '#site/content'
import LocalHeader from '@/app/components/LocalHeader'
import {
  adjacentMonth,
  firstSentencePreview,
  isOrdinaryPath,
  isValidMonth,
  monthFromDate,
  monthLabel,
  ordinaryDateLabel,
  publicHrefForPost,
  todayInOrdinaryTimeZone,
} from '@/lib/ordinary'
import { siteConfig } from '@/site.config'
import { uiText } from '@/lib/ui-text'
import styles from './page.module.css'

type Props = {
  params: Promise<{ month: string }>
}

export const dynamic = 'force-dynamic'

export default async function OrdinaryMonthPage({ params }: Props) {
  if (!siteConfig.enableOrdinaryNotes) notFound()
  const { month } = await params
  if (!isValidMonth(month)) notFound()

  const today = todayInOrdinaryTimeZone()
  const currentMonth = monthFromDate(today) === month
  const monthPosts = posts.filter(
    (post) => isOrdinaryPath(post.slug) && post.date !== undefined && monthFromDate(post.date) === month,
  )
  const groups = new Map<string, typeof monthPosts>()
  for (const post of monthPosts) {
    const entries = groups.get(post.date!) ?? []
    entries.push(post)
    groups.set(post.date!, entries)
  }
  if (currentMonth && !groups.has(today)) groups.set(today, [])
  const dates = [...groups.keys()].sort((a, b) => b.localeCompare(a))

  return (
    <main className={styles.main}>
      <LocalHeader title={monthLabel(month)} />
      <nav className={styles.monthNav} aria-label={monthLabel(month)}>
        <Link className={styles.monthLink} href={`/ordinary/${adjacentMonth(month, -1)}`}>
          ← {uiText.ordinary.previousMonth}
        </Link>
        <Link className={styles.monthLink} href={`/ordinary/${adjacentMonth(month, 1)}`}>
          {uiText.ordinary.nextMonth} →
        </Link>
      </nav>
      {dates.length === 0 && <p className={styles.empty}>{uiText.ordinary.emptyMonth}</p>}
      {dates.map((date) => {
        const entries = (groups.get(date) ?? []).sort(
          (a, b) => a.plainText.length - b.plainText.length || a.title.localeCompare(b.title),
        )
        return (
          <section key={date} className={styles.day} aria-labelledby={date}>
            <h2 id={date} className={styles.date}>
              <a className={styles.dateLink} href={`#${date}`}>
                {ordinaryDateLabel(date)}
              </a>
            </h2>
            {entries.length === 0 ? (
              <p className={styles.empty}>{uiText.ordinary.emptyToday}</p>
            ) : (
              <div className={styles.cards}>
                {entries.map((post) => (
                  <article key={post.slug} className={styles.card}>
                    <Link className={styles.cardTitle} href={publicHrefForPost(post)}>
                      {post.title}
                    </Link>
                    {firstSentencePreview(post.plainText) && (
                      <p className={styles.preview}>{firstSentencePreview(post.plainText)}</p>
                    )}
                    {post.topics.length > 0 && (
                      <ul className={styles.topicList}>
                        {post.topics.map((topic) => (
                          <li key={topic}>
                            <Link className={styles.topicChip} href={`/topics/${encodeURIComponent(topic)}`}>
                              {topic}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        )
      })}
    </main>
  )
}

import { notFound } from 'next/navigation'
import { pages } from '#site/content'
import { MDXContent } from '@/app/components/MDXContent'
import ReadingHeader from '@/app/components/ReadingHeader'
import styles from './page.module.css'

export default function GuidePage() {
  const guide = pages.find((p) => p.name === 'guide')
  if (!guide) notFound()

  return (
    <main className={styles.main}>
      <ReadingHeader title={guide.title} />
      <article className={styles.article}>
        <MDXContent code={guide.body} />
      </article>
    </main>
  )
}

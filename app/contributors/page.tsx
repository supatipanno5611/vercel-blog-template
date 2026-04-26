import { notFound } from 'next/navigation'
import { pages } from '#site/content'
import { MDXContent } from '@/app/components/MDXContent'
import ReadingHeader from '@/app/components/ReadingHeader'
import styles from './page.module.css'

export default function ContributorsPage() {
  const contributors = pages.find((p) => p.name === 'contributor')
  if (!contributors) notFound()

  return (
    <main className={styles.main}>
      <ReadingHeader title={contributors.title} />
      <article className={styles.article}>
        <MDXContent code={contributors.body} />
      </article>
    </main>
  )
}

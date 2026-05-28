import Link from 'next/link'
import { posts } from '#site/content'
import LocalHeader from '@/app/components/LocalHeader'
import { uiText } from '@/lib/ui-text'
import styles from './page.module.css'

function compareByTitle(a: (typeof posts)[number], b: (typeof posts)[number]) {
  return a.title.localeCompare(b.title, 'ko')
}

function childCountFor(slugAsParams: string) {
  return posts.filter((post) => post.type !== 'index' && post.parent === slugAsParams).length
}

export default function IndexesPage() {
  const indexPosts = posts.filter((post) => post.type === 'index').sort(compareByTitle)

  return (
    <main className={styles.main}>
      <LocalHeader title={uiText.indexes.title} />
      {indexPosts.length === 0 ? (
        <p className={styles.empty}>{uiText.indexes.empty}</p>
      ) : (
        <ul className={styles.list}>
          {indexPosts.map((post) => (
            <li key={post.slugAsParams}>
              <Link className={styles.item} href={`/${post.slugAsParams}`}>
                <span className={styles.title}>{post.title}</span>
                <span className={styles.count}>{uiText.common.postCount(childCountFor(post.slugAsParams))}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

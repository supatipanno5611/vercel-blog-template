import { notFound } from 'next/navigation'
import { posts } from '#site/content'
import { MDXContent } from '@/app/components/MDXContent'
import ReadingHeader from '@/app/components/ReadingHeader'
import styles from './page.module.css'

type Props = {
  params: Promise<{ slug: string[] }>
}

export async function generateStaticParams() {
  return posts
    .filter((p) => !p.draft)
    .map((p) => ({
      slug: p.slugAsParams.split('/'),
    }))
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params
  const path = slug.map((s) => decodeURIComponent(s)).join('/')
  const post = posts.find((p) => p.slugAsParams === path)

  if (!post) notFound()

  const relatedPosts = post.base.length > 0
    ? posts.filter((p) => !p.draft && p.slugAsParams !== post.slugAsParams && p.base.some((b) => post.base.includes(b))).slice(0, 5)
    : []

  return (
    <main className={styles.main}>
      <ReadingHeader title={post.title} />
      <article className={styles.article}>
        <MDXContent code={post.body} />
      </article>
      {relatedPosts.length > 0 && (
        <footer className={styles.footer}>
          <p className={styles.footerLabel}>같은 주제의 글</p>
          <ul className={styles.relatedList}>
            {relatedPosts.map((p) => (
              <li key={p.slug}>
                <a href={`/${p.slugAsParams}`} className={styles.relatedLink}>{p.title}</a>
              </li>
            ))}
          </ul>
        </footer>
      )}
    </main>
  )
}

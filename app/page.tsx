import { notFound } from 'next/navigation'
import { posts } from '#site/content'
import { MarkdownContent } from '@/app/components/MarkdownContent'
import Header from '@/app/components/Header'
import { extractTocItems } from '@/lib/heading-toc'
import { isHomeLinkPagePath } from '@/lib/home-link-pages'
import { siteConfig } from '@/site.config'
import styles from './page.module.css'

export default function HomePage() {
  const home = posts.find((p) => p.slugAsParams === siteConfig.homeSlug)
  if (!home) notFound()
  const enableHeadingAnchors = !home.youtubeId && !home.audioSrc
  const tocItems = enableHeadingAnchors ? extractTocItems(home.body) : []
  const homeLinkPosts = posts
    .filter((p) => !p.draft && isHomeLinkPagePath(p.slug))
    .sort((a, b) => a.slug.localeCompare(b.slug))

  return (
    <main className={styles.main}>
      <Header title={home.title} tocItems={tocItems} />
      <article className={styles.article}>
        <MarkdownContent source={home.body} enableHeadingAnchors={enableHeadingAnchors} />
      </article>
      {homeLinkPosts.length > 0 && (
        <footer className={styles.footer}>
          {homeLinkPosts.map((post) => (
            <a key={post.slug} href={`/${post.slugAsParams}`} className={styles.footerLink}>
              {post.title} →
            </a>
          ))}
        </footer>
      )}
    </main>
  )
}

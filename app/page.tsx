import { notFound } from 'next/navigation'
import { posts } from '#site/content'
import { MarkdownContent } from '@/app/components/MarkdownContent'
import Header from '@/app/components/Header'
import TodayOrdinaryLink from '@/app/components/TodayOrdinaryLink'
import { extractTocItems } from '@/lib/heading-toc'
import { isHomeLinkPagePath } from '@/lib/home-link-pages'
import { uiText } from '@/lib/ui-text'
import { siteConfig } from '@/site.config'
import styles from './page.module.css'

export default function HomePage() {
  const home = posts.find((p) => p.slugAsParams === siteConfig.homeSlug)
  if (!home) notFound()
  const enableHeadingAnchors = !home.youtubeId && !home.audioSrc
  const tocItems = enableHeadingAnchors ? extractTocItems(home.body) : []
  const homeLinkPosts = posts
    .filter((p) => isHomeLinkPagePath(p.slug))
    .sort((a, b) => a.slug.localeCompare(b.slug))
  const hasIndexPosts = posts.some((post) => post.type === 'index')

  return (
    <main className={styles.main}>
      <Header title={home.title} tocItems={tocItems} />
      <article className={styles.article}>
        <MarkdownContent
          source={home.body}
          enableHeadingAnchors={enableHeadingAnchors}
          preserveLineBreaks={siteConfig.preserveMarkdownLineBreaks}
        />
      </article>
      <footer className={styles.footer}>
        {siteConfig.enableOrdinaryNotes && <TodayOrdinaryLink className={styles.footerLink} />}
        <a href="/topics/search" className={styles.footerLink}>
          {uiText.topic.browse} →
        </a>
        {hasIndexPosts && (
          <a href="/indexes" className={styles.footerLink}>
            {uiText.indexes.title} →
          </a>
        )}
        {homeLinkPosts.length > 0 && (
          <>
          {homeLinkPosts.map((post) => (
            <a key={post.slug} href={`/${post.slugAsParams}`} className={styles.footerLink}>
              {post.title} →
            </a>
          ))}
          </>
        )}
      </footer>
    </main>
  )
}

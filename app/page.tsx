import { notFound } from 'next/navigation'
import { posts } from '#site/content'
import { MarkdownContent } from '@/app/components/MarkdownContent'
import Header from '@/app/components/Header'
import { extractTocItems } from '@/lib/heading-toc'
import { siteConfig } from '@/site.config'
import styles from './page.module.css'

export default function HomePage() {
  const home = posts.find((p) => p.slugAsParams === siteConfig.homeSlug)
  if (!home) notFound()
  const enableHeadingAnchors = !home.youtubeId && !home.audioSrc
  const tocItems = enableHeadingAnchors ? extractTocItems(home.body) : []

  return (
    <main className={styles.main}>
      <Header title={home.title} tocItems={tocItems} />
      <article className={styles.article}>
        <MarkdownContent source={home.body} enableHeadingAnchors={enableHeadingAnchors} />
      </article>
      <footer className={styles.footer}>
        {siteConfig.footerLinks.map((link) => (
          <a key={link.slug} href={`/${link.slug}`} className={styles.footerLink}>
            {link.label} →
          </a>
        ))}
      </footer>
    </main>
  )
}

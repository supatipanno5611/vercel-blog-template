import { notFound } from 'next/navigation'
import { posts } from '#site/content'
import { MarkdownContent } from '@/app/components/MarkdownContent'
import AudioFab from '@/app/components/AudioFab'
import AudioSeekbar from '@/app/components/AudioSeekbar'
import { CueProvider } from '@/app/components/CueProvider'
import Header from '@/app/components/Header'
import YouTubeEmbed from '@/app/components/YouTubeEmbed'
import { safeDecodeURIComponent } from '@/lib/safe-decode'
import { extractTocItems } from '@/lib/heading-toc'
import { overlapCount, jaccard } from '@/lib/topics'
import { uiText } from '@/lib/ui-text'
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
  const decodedSlug: string[] = []
  for (const segment of slug) {
    const decodedSegment = safeDecodeURIComponent(segment)
    if (decodedSegment === null) notFound()
    decodedSlug.push(decodedSegment)
  }
  const path = decodedSlug.join('/')
  const post = posts.find((p) => p.slugAsParams === path)

  if (!post) notFound()

  const relatedPosts =
    post.base.length > 0
      ? posts
          .filter((p) => !p.draft && p.slugAsParams !== post.slugAsParams && p.base.some((b) => post.base.includes(b)))
          .map((p) => ({ p, overlap: overlapCount(p.base, post.base), sim: jaccard(p.base, post.base) }))
          .sort((a, b) => b.overlap - a.overlap || b.sim - a.sim)
          .slice(0, 5)
          .map((x) => x.p)
      : []
  const backlinks = posts
    .filter((p) => !p.draft && p.slugAsParams !== post.slugAsParams && p.wikiLinks.includes(post.slugAsParams))
    .slice(0, 5)
  const hasFooter = Boolean(post.audioTitle) || post.base.length > 0 || relatedPosts.length > 0 || backlinks.length > 0
  const enableHeadingAnchors = !post.youtubeId && !post.audioSrc
  const tocItems = enableHeadingAnchors ? extractTocItems(post.body) : []

  return (
    <CueProvider>
      <main className={styles.main} data-has-audio={post.hasAudio || undefined}>
        <Header title={post.title} showAudioRepeat={post.hasAudio} tocItems={tocItems} />
        {post.hasAudio && <AudioSeekbar />}
        {post.youtubeId && <YouTubeEmbed id={post.youtubeId} />}
        {post.audioSrc && <audio src={post.audioSrc} preload="metadata" />}
        <article className={styles.article}>
          <MarkdownContent source={post.body} enableHeadingAnchors={enableHeadingAnchors} />
        </article>
        {post.hasAudio && <AudioFab />}
        {hasFooter && (
          <footer className={styles.footer}>
            {post.audioTitle && (
              <div className={styles.audioBlock}>
                <p className={styles.footerLabel}>{uiText.postFooter.audio}</p>
                <p className={styles.audioTitle}>{post.audioTitle}</p>
              </div>
            )}
            {post.base.length > 0 && (
              <div className={styles.topicsBlock}>
                <p className={styles.footerLabel}>{uiText.postFooter.topics}</p>
                <ul className={styles.topicChipList}>
                  {post.base.map((base) => (
                    <li key={base}>
                      <a href={`/topics/${encodeURIComponent(base)}`} className={styles.topicChip}>
                        {base}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {relatedPosts.length > 0 && (
              <div>
                <p className={styles.footerLabel}>{uiText.postFooter.related}</p>
                <ul className={styles.relatedList}>
                  {relatedPosts.map((p) => (
                    <li key={p.slug}>
                      <a href={`/${p.slugAsParams}`} className={styles.relatedLink}>
                        {p.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {backlinks.length > 0 && (
              <div>
                <p className={styles.footerLabel}>{uiText.postFooter.backlinks}</p>
                <ul className={styles.relatedList}>
                  {backlinks.map((p) => (
                    <li key={p.slug}>
                      <a href={`/${p.slugAsParams}`} className={styles.relatedLink}>
                        {p.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </footer>
        )}
      </main>
    </CueProvider>
  )
}

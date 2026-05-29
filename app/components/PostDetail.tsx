import { posts } from '#site/content'
import { MarkdownContent } from '@/app/components/MarkdownContent'
import AudioFab from '@/app/components/AudioFab'
import AudioSeekbar from '@/app/components/AudioSeekbar'
import { CueProvider } from '@/app/components/CueProvider'
import Header from '@/app/components/Header'
import ParentTocFab from '@/app/components/ParentTocFab'
import YouTubeEmbed from '@/app/components/YouTubeEmbed'
import { extractTocItems } from '@/lib/heading-toc'
import { isOrdinaryPath, monthFromDate, monthLabel, publicHrefForPost } from '@/lib/ordinary'
import { getIndexToc, getParentToc } from '@/lib/parent-toc'
import { overlapCount, jaccard } from '@/lib/topics'
import { uiText } from '@/lib/ui-text'
import { siteConfig } from '@/site.config'
import styles from '@/app/[...slug]/page.module.css'

type Post = (typeof posts)[number]

export default function PostDetail({ post }: { post: Post }) {
  const relatedPosts =
    post.topics.length > 0
      ? posts
          .filter(
            (candidate) =>
              candidate.slugAsParams !== post.slugAsParams &&
              candidate.topics.some((topic) => post.topics.includes(topic)) &&
              (siteConfig.enableOrdinaryNotes || !isOrdinaryPath(candidate.slug)),
          )
          .map((candidate) => ({ candidate, overlap: overlapCount(candidate.topics, post.topics), sim: jaccard(candidate.topics, post.topics) }))
          .sort((a, b) => b.overlap - a.overlap || b.sim - a.sim)
          .slice(0, 5)
          .map((item) => item.candidate)
      : []
  const backlinks = posts
    .filter(
      (candidate) =>
        candidate.slugAsParams !== post.slugAsParams &&
        candidate.wikiLinks.includes(post.slugAsParams) &&
        (siteConfig.enableOrdinaryNotes || !isOrdinaryPath(candidate.slug)),
    )
    .slice(0, 5)
  const enableHeadingAnchors = !post.youtubeId && !post.audioSrc
  const showChapterMenu = Boolean(post.youtubeId || post.audioSrc)
  const tocItems = enableHeadingAnchors ? extractTocItems(post.body) : []
  const parentToc = getParentToc(post, posts)
  const indexToc = getIndexToc(post, posts)
  const hasBody = post.body.trim().length > 0
  const ordinary = isOrdinaryPath(post.slug)

  return (
    <CueProvider>
      <main
        className={styles.main}
        data-has-audio={post.hasAudio || undefined}
        data-has-parent-toc={parentToc ? true : undefined}
      >
        <Header
          title={post.title}
          showHomeLink
          showChapterMenu={showChapterMenu}
          showAudioRepeat={post.hasAudio}
          tocItems={tocItems}
        />
        {post.hasAudio && <AudioSeekbar />}
        {post.youtubeId && <YouTubeEmbed id={post.youtubeId} />}
        {post.audioSrc && <audio src={post.audioSrc} preload="metadata" />}
        {hasBody && (
          <article className={`${styles.article} ${indexToc ? styles.articleWithIndexToc : ''}`}>
            <MarkdownContent
              source={post.body}
              enableHeadingAnchors={enableHeadingAnchors}
              preserveLineBreaks={siteConfig.preserveMarkdownLineBreaks}
            />
          </article>
        )}
        {indexToc && (
          <section className={styles.indexToc} aria-labelledby="index-toc-heading">
            <h2 id="index-toc-heading" className={styles.indexTocHeading}>
              {uiText.indexToc.heading}
            </h2>
            {indexToc.items.length > 0 ? (
              <ul className={styles.indexTocList}>
                {indexToc.items.map((item) => (
                  <li key={item.slugAsParams}>
                    <a href={`/${item.slugAsParams}`} className={styles.indexTocLink}>
                      {item.title}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.indexTocEmpty}>{uiText.indexToc.empty}</p>
            )}
          </section>
        )}
        {post.hasAudio && <AudioFab />}
        {parentToc && <ParentTocFab toc={parentToc} currentSlug={post.slugAsParams} />}
        {post.type !== 'index' && (
          <footer className={styles.footer}>
            <div>
              <p className={styles.footerLabel}>{uiText.postFooter.info}</p>
              <dl className={styles.personList}>
                <div className={styles.personRow}>
                  <dt>{uiText.postFooter.title}</dt>
                  <dd className={styles.footerTitle}>{post.title}</dd>
                </div>
                {post.date && (
                  <div className={styles.personRow}>
                    <dt>{uiText.postFooter.date}</dt>
                    <dd>{post.date}</dd>
                  </div>
                )}
                {ordinary && post.date && (
                  <div className={styles.personRow}>
                    <dt>{uiText.postFooter.ordinaryMonth}</dt>
                    <dd>
                      <a href={`/ordinary/${monthFromDate(post.date)}`} className={styles.relatedLink}>
                        {monthLabel(monthFromDate(post.date))}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </div>
            {post.audioTitle && (
              <div className={styles.audioBlock}>
                <p className={styles.footerLabel}>{uiText.postFooter.audio}</p>
                <p className={styles.audioTitle}>{post.audioTitle}</p>
              </div>
            )}
            {post.topics.length > 0 && (
              <div className={styles.topicsBlock}>
                <p className={styles.footerLabel}>{uiText.postFooter.topics}</p>
                <ul className={styles.topicChipList}>
                  {post.topics.map((topic) => (
                    <li key={topic}>
                      <a href={`/topics/${encodeURIComponent(topic)}`} className={styles.topicChip}>
                        {topic}
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
                  {relatedPosts.map((candidate) => (
                    <li key={candidate.slug}>
                      <a href={publicHrefForPost(candidate)} className={styles.relatedLink}>
                        {candidate.title}
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
                  {backlinks.map((candidate) => (
                    <li key={candidate.slug}>
                      <a href={publicHrefForPost(candidate)} className={styles.relatedLink}>
                        {candidate.title}
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

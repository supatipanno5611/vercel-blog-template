import { defineConfig, defineCollection, s } from 'velite'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import { VFile } from 'vfile'
import { remarkPlainText } from './lib/remark-plain-text'
import { remarkMark } from './lib/remark-mark'
import { remarkCallout } from './lib/remark-callout'
import { remarkWikiLink } from './lib/remark-wiki-link'
import { remarkCue } from './lib/remark-cue'
import { remarkChapter } from './lib/remark-chapter'
import { isSafeAudioSrc, YOUTUBE_ID_RE } from './lib/markdown-security'
import { rejectMdxSyntax, remarkMarkdownOnly } from './lib/remark-markdown-only'
import { extractWikiLinks } from './lib/wiki-link'
import { publicSlugForContentPath, titleForContentPath } from './lib/home-link-pages'

function stripFencedCode(source: string) {
  return source.replace(/(^|\n)(`{3,}|~{3,})[\s\S]*?\n\2(?=\n|$)/g, '$1')
}

function hasFrontmatterKey(source: string, key: string) {
  const open = source.match(/^---\r?\n/)
  if (!open) return false
  const closeRe = /\r?\n---(?:\r?\n|$)/g
  closeRe.lastIndex = open[0].length
  const close = closeRe.exec(source)
  if (!close) return false
  return new RegExp(`^${key}:\\s*`, 'm').test(source.slice(open[0].length, close.index))
}

const posts = defineCollection({
  name: 'Post',
  pattern: '**/*.md',
  schema: s.object({
    draft: s.boolean().default(false),
    base: s.string().array().default([]),
    youtubeId: s.string().optional(),
    audioSrc: s.string().optional(),
    audioTitle: s.string().optional(),
    slug: s.path(),
    body: s.raw(),
    raw: s.raw(),
  }).transform(async ({ raw, ...data }) => {
    const source = raw ?? ''
    const markdownBody = stripFencedCode(source)
    rejectMdxSyntax(source)
    if (hasFrontmatterKey(source, 'media')) throw new Error('media frontmatter is no longer supported')
    if (/::(?:youtube|audio)\b/.test(markdownBody)) throw new Error('media directives are no longer supported')
    if (data.youtubeId && data.audioSrc) throw new Error('youtubeId and audioSrc cannot be used together')
    if (data.youtubeId && !YOUTUBE_ID_RE.test(data.youtubeId)) throw new Error(`Invalid YouTube id: ${data.youtubeId}`)
    if (data.audioSrc && !isSafeAudioSrc(data.audioSrc)) throw new Error(`Invalid audio src: ${data.audioSrc}`)
    if (data.audioSrc && !data.audioTitle?.trim()) throw new Error('audioTitle is required when audioSrc is set')
    if (!data.audioSrc && data.audioTitle !== undefined) throw new Error('audioTitle requires audioSrc')
    const audioTitle = data.audioTitle?.trim()

    const processor = unified()
      .use(remarkParse)
      .use(remarkMarkdownOnly)
      .use(remarkMark)
      .use(remarkCallout)
      .use(remarkWikiLink)
      .use(remarkCue)
      .use(remarkChapter)
      .use(remarkPlainText)
    const tree = processor.parse(source)
    const file = new VFile({ value: source })
    await processor.run(tree, file)
    return {
      ...data,
      title: titleForContentPath(data.slug),
      slugAsParams: publicSlugForContentPath(data.slug),
      plainText: file.data.plainText ?? '',
      audioTitle,
      hasAudio: Boolean(data.audioSrc),
      wikiLinks: extractWikiLinks(source).map((link) => link.target),
    }
  }),
})

export default defineConfig({
  root: 'content',
  output: {
    data: '.velite',
    assets: 'public/static',
  },
  collections: { posts },
})

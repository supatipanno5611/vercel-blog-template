import { defineConfig, defineCollection, s } from 'velite'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkDirective from 'remark-directive'
import { VFile } from 'vfile'
import { remarkPlainText } from './lib/remark-plain-text'
import { remarkMark } from './lib/remark-mark'
import { remarkCallout } from './lib/remark-callout'
import { remarkWikiLink } from './lib/remark-wiki-link'
import { remarkCue } from './lib/remark-cue'
import { remarkChapter } from './lib/remark-chapter'
import { remarkDirectiveEmbeds } from './lib/remark-directive-embeds'
import { rejectMdxSyntax, remarkMarkdownOnly } from './lib/remark-markdown-only'

const posts = defineCollection({
  name: 'Post',
  pattern: '**/*.md',
  schema: s.object({
    draft: s.boolean().default(false),
    base: s.string().array().default([]),
    slug: s.path(),
    body: s.raw(),
    raw: s.raw(),
  }).transform(async ({ raw, ...data }) => {
    const source = raw ?? ''
    rejectMdxSyntax(source)

    const processor = unified()
      .use(remarkParse)
      .use(remarkDirective)
      .use(remarkMarkdownOnly)
      .use(remarkDirectiveEmbeds)
      .use(remarkMark)
      .use(remarkCallout)
      .use(remarkWikiLink)
      .use(remarkCue)
      .use(remarkChapter)
      .use(remarkPlainText)
    const tree = processor.parse(source)
    const file = new VFile({ value: source })
    await processor.run(tree, file)
    const filename = data.slug.split('/').pop() ?? data.slug
    return {
      ...data,
      title: filename,
      slugAsParams: data.slug.replace(/\s+/g, '-'),
      plainText: file.data.plainText ?? '',
      hasAudio: /::audio\b/.test(source),
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

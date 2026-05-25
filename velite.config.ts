import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { cwd } from 'node:process'
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
import { isNestedOrdinaryPath, isValidContentDate, requiresContentDate } from './lib/ordinary'
import { siteConfig } from './site.config'

const ROOT = cwd()
const CONTENT_DIR = join(ROOT, 'content')

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

function cleanStringList(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean)
}

function listMarkdownFiles(dir: string): string[] {
  if (!existsSync(dir)) return []
  const files: string[] = []

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...listMarkdownFiles(path))
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(path)
  }

  return files
}

function parseFrontmatterData(source: string) {
  const open = source.match(/^---\r?\n/)
  if (!open) return {}
  const closeRe = /\r?\n---(?:\r?\n|$)/g
  closeRe.lastIndex = open[0].length
  const close = closeRe.exec(source)
  if (!close) return {}

  const data: Record<string, string> = {}
  const matter = source.slice(open[0].length, close.index)
  for (const line of matter.split(/\r?\n/)) {
    const scalar = line.match(/^([A-Za-z][\w-]*):\s*(.*?)\s*$/)
    if (!scalar) continue
    data[scalar[1]] = scalar[2].replace(/^(['"])(.*)\1$/, '$2')
  }
  return data
}

function parseOrder(source: string) {
  const open = source.match(/^---\r?\n/)
  if (!open) return undefined
  const closeRe = /\r?\n---(?:\r?\n|$)/g
  closeRe.lastIndex = open[0].length
  const close = closeRe.exec(source)
  if (!close) return undefined

  const matter = source.slice(open[0].length, close.index)
  const match = matter.match(/^order:\s*(.*?)\s*$/m)
  if (!match) return undefined
  if (!/^[1-9]\d*$/.test(match[1])) return null
  return Number(match[1])
}

function validateContentRelationships() {
  const files = listMarkdownFiles(CONTENT_DIR)
  type ContentRelationship = { file: string; ref: string; type?: string; parent?: string; order?: number | null }
  const bySlug = new Map<string, ContentRelationship>()
  const byRef = new Map<string, ContentRelationship>()

  for (const file of files) {
    const rel = relative(CONTENT_DIR, file).replace(/\\/g, '/')
    const ref = rel.replace(/\.md$/, '')
    const slug = publicSlugForContentPath(rel)
    const source = readFileSync(file, 'utf8')
    const data = parseFrontmatterData(source)
    if (data.type && data.type !== 'index') throw new Error(`${rel} has unsupported type: ${data.type}`)
    const existing = bySlug.get(slug)
    if (existing) {
      throw new Error(`duplicate slug after normalization: ${existing.file} and ${rel} both map to ${slug}`)
    }
    const post = { file: rel, ref, type: data.type, parent: data.parent, order: parseOrder(source) }
    bySlug.set(slug, post)
    byRef.set(ref, post)
  }

  const ordersByParent = new Map<string, Map<number, string>>()

  for (const post of bySlug.values()) {
    if (post.type === 'index' && post.parent) throw new Error(`${post.file} cannot declare parent because type: index is top-level`)
    if (post.type === 'index' && post.order !== undefined) throw new Error(`${post.file} cannot declare order because type: index is top-level`)
    if (!post.parent && post.order !== undefined) throw new Error(`${post.file} cannot declare order without parent`)
    if (!post.parent) continue
    if (post.order === undefined) throw new Error(`${post.file} must declare order because it references parent: ${post.parent}`)
    if (post.order === null) throw new Error(`${post.file} has invalid order: order must be a positive integer`)
    const parent = byRef.get(post.parent)
    if (!parent) throw new Error(`${post.file} references missing parent: ${post.parent}`)
    if (post.parent === post.ref) throw new Error(`${post.file} cannot reference itself as parent`)
    if (parent.type !== 'index') throw new Error(`${post.file} parent must reference type: index post: ${post.parent}`)
    const siblingOrders = ordersByParent.get(post.parent) ?? new Map<number, string>()
    const existing = siblingOrders.get(post.order)
    if (existing) throw new Error(`${post.file} duplicates order ${post.order} with ${existing}`)
    siblingOrders.set(post.order, post.file)
    ordersByParent.set(post.parent, siblingOrders)
  }
}

validateContentRelationships()

const posts = defineCollection({
  name: 'Post',
  pattern: '**/*.md',
  schema: s.object({
    type: s.enum(['index']).optional(),
    parent: s.string().optional(),
    order: s.number().optional(),
    topics: s.string().array().default([]),
    date: s.string().optional(),
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
    if (hasFrontmatterKey(source, 'draft')) throw new Error('draft frontmatter is no longer supported; publish only files in VAULT_PUBLISH')
    if (isNestedOrdinaryPath(data.slug)) throw new Error('ordinary posts must be stored directly under content/ordinary')
    if (requiresContentDate(data.slug, data.type, siteConfig.homeSlug) && !data.date) {
      throw new Error('date frontmatter is required for readable posts')
    }
    if (data.date !== undefined && !isValidContentDate(data.date)) {
      throw new Error(`Invalid date: ${data.date}`)
    }
    if (data.type === 'index' && hasFrontmatterKey(source, 'topics')) throw new Error('type: index posts cannot use topics frontmatter')
    if (data.type === 'index' && hasFrontmatterKey(source, 'order')) throw new Error('type: index posts cannot use order frontmatter')
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
      parent: data.parent ? publicSlugForContentPath(data.parent) : undefined,
      plainText: file.data.plainText ?? '',
      topics: cleanStringList(data.topics),
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

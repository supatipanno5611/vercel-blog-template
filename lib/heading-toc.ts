import type { Heading, Root } from 'mdast'
import { unified } from 'unified'
import remarkParse from 'remark-parse'

export type TocItem = {
  id: string
  depth: 2 | 3 | 4
  title: string
}

const CHAPTER_RE = /^\d{1,2}:\d{2}(?::\d{2})?\s+.+$/

function textFromNode(node: unknown): string {
  if (!node || typeof node !== 'object') return ''
  const value = (node as { value?: unknown }).value
  if (typeof value === 'string') return value
  const children = (node as { children?: unknown }).children
  if (!Array.isArray(children)) return ''
  return children.map(textFromNode).join('')
}

export function slugifyHeading(text: string) {
  const slug = text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_\-\s]+/gu, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return slug || 'section'
}

export function uniqueHeadingId(base: string, counts: Map<string, number>) {
  const count = counts.get(base) ?? 0
  counts.set(base, count + 1)
  return count === 0 ? base : `${base}-${count}`
}

export function extractTocItems(source: string): TocItem[] {
  const tree = unified().use(remarkParse).parse(source) as Root
  const counts = new Map<string, number>()
  const items: TocItem[] = []

  for (const node of tree.children) {
    if (node.type !== 'heading') continue
    const heading = node as Heading
    if (heading.depth < 2 || heading.depth > 4) continue

    const title = textFromNode(heading).trim()
    if (!title || (heading.depth === 2 && CHAPTER_RE.test(title))) continue

    const base = slugifyHeading(title)
    items.push({
      id: uniqueHeadingId(base, counts),
      depth: heading.depth as 2 | 3 | 4,
      title,
    })
  }

  return items
}

import { posts } from '#site/content'
import { isHomeLinkPagePath } from '@/lib/home-link-pages'
import { siteConfig } from '@/site.config'

function visiblePosts() {
  return posts.filter((p) => !p.draft && p.slugAsParams !== siteConfig.homeSlug && !isHomeLinkPagePath(p.slug))
}

export type TopicInfo = { name: string; count: number }

export function getAllTopics(): TopicInfo[] {
  const counts = new Map<string, number>()
  for (const post of visiblePosts()) {
    for (const base of post.base) {
      counts.set(base, (counts.get(base) ?? 0) + 1)
    }
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

export function getPostsByTopic(topic: string) {
  return visiblePosts().filter((p) => p.base.includes(topic))
}

export function getAllPosts() {
  return visiblePosts().map((p) => ({
    slugAsParams: p.slugAsParams as string,
    title: p.title as string,
    base: p.base as string[],
  }))
}

export function overlapCount(a: string[], b: string[]): number {
  return a.filter((x) => b.includes(x)).length
}

export function jaccard(a: string[], b: string[]): number {
  const inter = a.filter((x) => b.includes(x)).length
  const union = new Set([...a, ...b]).size
  return union === 0 ? 0 : inter / union
}

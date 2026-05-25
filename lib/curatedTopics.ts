import { posts } from '#site/content'
import { siteConfig } from '@/site.config'

export function getCuratedTopics(): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const title of siteConfig.curatedTopicSourceTitles) {
    const post = posts.find((p) => p.title === title)
    if (!post) continue

    for (const topic of post.topics) {
      if (seen.has(topic)) continue
      seen.add(topic)
      result.push(topic)
    }
  }

  return result
}

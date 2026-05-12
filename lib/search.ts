import { posts } from '#site/content'
import { isHomeLinkPagePath } from '@/lib/home-link-pages'
import { siteConfig } from '@/site.config'

export type SearchDoc = {
  id: string
  title: string
  url: string
  body: string
  base: string
  audioTitle: string
  tags: string[]
}

export function getSearchDocs(): SearchDoc[] {
  return posts
    .filter((p) => !p.draft && p.slugAsParams !== siteConfig.homeSlug && !isHomeLinkPagePath(p.slug))
    .map((p) => {
      const audioTitle = p.audioTitle ?? ''
      return {
        id: p.slugAsParams,
        title: p.title,
        url: `/${p.slugAsParams}`,
        body: p.plainText,
        base: p.base.join(' '),
        audioTitle,
        tags: p.base,
      }
    })
}

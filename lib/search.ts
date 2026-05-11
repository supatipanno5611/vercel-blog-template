import { posts } from '#site/content'
import { getChoseong } from 'es-hangul'
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
  choseong: string
}

export function getSearchDocs(): SearchDoc[] {
  return posts
    .filter((p) => !p.draft && p.slugAsParams !== siteConfig.homeSlug && !isHomeLinkPagePath(p.slug))
    .map((p) => {
      const baseStr = p.base.join(' ')
      const audioTitle = p.audioTitle ?? ''
      const text = `${p.title} ${p.plainText} ${baseStr} ${audioTitle}`
      return {
        id: p.slugAsParams,
        title: p.title,
        url: `/${p.slugAsParams}`,
        body: p.plainText,
        base: baseStr,
        audioTitle,
        tags: p.base,
        choseong: getChoseong(text),
      }
    })
}

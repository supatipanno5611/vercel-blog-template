type ParentPost = {
  slug: string
  slugAsParams: string
  title: string
  type?: 'index'
  parent?: string
  order?: number
}

export type ParentTocLink = {
  slugAsParams: string
  title: string
}

export type ParentToc = {
  index: ParentTocLink
  items: ParentTocLink[]
}

export type IndexToc = {
  items: ParentTocLink[]
}

function toTocLink(post: ParentPost): ParentTocLink {
  return {
    slugAsParams: post.slugAsParams,
    title: post.title,
  }
}

function compareByOrder(a: ParentPost, b: ParentPost) {
  return (a.order ?? 0) - (b.order ?? 0)
}

export function getParentToc(current: ParentPost, posts: ParentPost[]): ParentToc | null {
  if (!current.parent || current.type === 'index') return null

  const index = posts.find((post) => post.slugAsParams === current.parent && post.type === 'index')
  if (!index) return null

  const items = posts
    .filter((post) => post.type !== 'index' && post.parent === current.parent)
    .sort(compareByOrder)
    .map(toTocLink)

  return {
    index: toTocLink(index),
    items,
  }
}

export function getIndexToc(current: ParentPost, posts: ParentPost[]): IndexToc | null {
  if (current.type !== 'index') return null

  const items = posts
    .filter((post) => post.type !== 'index' && post.parent === current.slugAsParams)
    .sort(compareByOrder)
    .map(toTocLink)

  return { items }
}

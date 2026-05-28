import { notFound } from 'next/navigation'
import { posts } from '#site/content'
import PostDetail from '@/app/components/PostDetail'
import { isOrdinaryPath, ordinaryEntrySlug } from '@/lib/ordinary'
import { safeDecodeURIComponent } from '@/lib/safe-decode'
import { siteConfig } from '@/site.config'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  if (!siteConfig.enableOrdinaryNotes) return []
  return posts
    .filter((post) => isOrdinaryPath(post.slug))
    .map((post) => ({ slug: ordinaryEntrySlug(post.slugAsParams) }))
}

export default async function OrdinaryPostPage({ params }: Props) {
  if (!siteConfig.enableOrdinaryNotes) notFound()
  const { slug } = await params
  const decodedSlug = safeDecodeURIComponent(slug)
  if (decodedSlug === null) notFound()
  const post = posts.find((candidate) => isOrdinaryPath(candidate.slug) && ordinaryEntrySlug(candidate.slugAsParams) === decodedSlug)
  if (!post) notFound()

  return <PostDetail post={post} />
}

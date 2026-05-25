import { notFound } from 'next/navigation'
import { posts } from '#site/content'
import PostDetail from '@/app/components/PostDetail'
import { isOrdinaryPath } from '@/lib/ordinary'
import { safeDecodeURIComponent } from '@/lib/safe-decode'

type Props = {
  params: Promise<{ slug: string[] }>
}

export async function generateStaticParams() {
  return posts
    .filter((post) => !isOrdinaryPath(post.slug))
    .map((post) => ({
      slug: post.slugAsParams.split('/'),
    }))
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params
  const decodedSlug: string[] = []
  for (const segment of slug) {
    const decodedSegment = safeDecodeURIComponent(segment)
    if (decodedSegment === null) notFound()
    decodedSlug.push(decodedSegment)
  }
  const path = decodedSlug.join('/')
  const post = posts.find((candidate) => candidate.slugAsParams === path && !isOrdinaryPath(candidate.slug))

  if (!post) notFound()

  return <PostDetail post={post} />
}

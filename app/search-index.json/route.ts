import { getSearchDocs } from '@/lib/search'

export function GET() {
  const docs = getSearchDocs()
  return Response.json(docs)
}

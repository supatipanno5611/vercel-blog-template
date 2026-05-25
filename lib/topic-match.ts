export function tagMatchesAnyTerm(tag: string, query: string): boolean {
  const terms = query.trim().split(/\s+/).filter(Boolean)
  const normalizedTag = tag.toLowerCase()
  return terms.some((term) => normalizedTag.includes(term.toLowerCase()))
}

export function topicIncludesQuery(name: string, query: string): boolean {
  if (!query.trim()) return true
  return name.toLowerCase().includes(query.toLowerCase().trim())
}

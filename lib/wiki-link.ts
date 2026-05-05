export type WikiLink = {
  target: string
  label: string
}

export function normalizeWikiTarget(target: string): string {
  return target
    .trim()
    .split('/')
    .map((part) => part.trim().replace(/\s+/g, '-'))
    .filter(Boolean)
    .join('/')
}

export function extractWikiLinks(source: string): WikiLink[] {
  const links: WikiLink[] = []
  const re = /\[\[([^\]\n]+?)\]\]/g
  let match: RegExpExecArray | null

  while ((match = re.exec(source))) {
    const [targetPart, aliasPart] = match[1].split('|')
    const target = normalizeWikiTarget(targetPart)
    if (!target) continue
    links.push({
      target,
      label: aliasPart?.trim() || targetPart.trim(),
    })
  }

  return links
}

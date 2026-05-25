export const HOME_LINK_PAGES_DIR = 'homeLinkPages'

function normalizeContentPath(value: string) {
  return value.replace(/\\/g, '/').replace(/\.md$/, '')
}

export function isHomeLinkPagePath(value: string) {
  return normalizeContentPath(value).startsWith(`${HOME_LINK_PAGES_DIR}/`)
}

export function stripHomeLinkOrderPrefix(value: string) {
  return value.replace(/^\d+\s+/, '')
}

export function stripContentOrderPrefix(value: string) {
  return value
    .split('/')
    .map((part) => part.replace(/^\d+\s+/, ''))
    .join('/')
}

export function publicSlugForContentPath(value: string) {
  const normalized = normalizeContentPath(value)
  const visiblePath = isHomeLinkPagePath(normalized)
    ? normalized.slice(HOME_LINK_PAGES_DIR.length + 1)
    : normalized
  return stripContentOrderPrefix(visiblePath).replace(/\s+/g, '-')
}

export function titleForContentPath(value: string) {
  const normalized = normalizeContentPath(value)
  const filename = normalized.split('/').pop() ?? normalized
  return stripContentOrderPrefix(filename)
}

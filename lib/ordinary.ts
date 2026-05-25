export const ORDINARY_DIR = 'ordinary'
export const ORDINARY_TIME_ZONE = 'Asia/Colombo'
const HOME_LINK_PAGES_DIR = 'homeLinkPages'

function normalizeContentPath(value: string) {
  return value.replace(/\\/g, '/').replace(/\.md$/, '').replace(/^content\//, '')
}

export function isOrdinaryPath(value: string) {
  return normalizeContentPath(value).startsWith(`${ORDINARY_DIR}/`)
}

export function isNestedOrdinaryPath(value: string) {
  const normalized = normalizeContentPath(value)
  return isOrdinaryPath(normalized) && normalized.slice(ORDINARY_DIR.length + 1).includes('/')
}

export function isValidContentDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const parsed = new Date(Date.UTC(year, month - 1, day))
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  )
}

export function isValidMonth(value: string) {
  if (!/^\d{4}-\d{2}$/.test(value)) return false
  const month = Number(value.slice(5))
  return month >= 1 && month <= 12
}

export function requiresContentDate(value: string, type: string | undefined, homeSlug: string) {
  const normalized = normalizeContentPath(value)
  return normalized !== homeSlug && !normalized.startsWith(`${HOME_LINK_PAGES_DIR}/`) && type !== 'index'
}

export function ordinaryEntrySlug(value: string) {
  const normalized = normalizeContentPath(value)
  return normalized.slice(ORDINARY_DIR.length + 1)
}

export function publicPathForPost(post: { slugAsParams: string; slug: string }) {
  if (!isOrdinaryPath(post.slug)) return post.slugAsParams
  return `${ORDINARY_DIR}/post/${ordinaryEntrySlug(post.slugAsParams)}`
}

export function publicHrefForPost(post: { slugAsParams: string; slug: string }) {
  return `/${publicPathForPost(post)}`
}

export function monthFromDate(value: string) {
  return value.slice(0, 7)
}

export function monthLabel(value: string) {
  const [year, month] = value.split('-').map(Number)
  return `${year}년 ${month}월 일상 노트`
}

export function ordinaryDateLabel(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'UTC',
    day: 'numeric',
    weekday: 'long',
  }).format(date)
}

export function adjacentMonth(value: string, offset: number) {
  const [year, month] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1 + offset, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

export function todayInOrdinaryTimeZone(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ORDINARY_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

export function todayOrdinaryHref(date = new Date()) {
  const today = todayInOrdinaryTimeZone(date)
  return `/${ORDINARY_DIR}/${monthFromDate(today)}#${today}`
}

export function firstSentencePreview(text: string, maxLength = 120) {
  const trimmed = text.trim()
  if (!trimmed) return ''
  const sentence = trimmed.match(/^.*?[.!?。！？](?=\s|$)/u)?.[0] ?? trimmed
  if (sentence.length <= maxLength) return sentence
  return `${sentence.slice(0, maxLength).trimEnd()}...`
}

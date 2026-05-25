import { existsSync } from 'node:fs'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { basename, extname, join, relative } from 'node:path'
import { argv, cwd, exit } from 'node:process'
import { isHomeLinkPagePath, publicSlugForContentPath, titleForContentPath } from '../lib/home-link-pages.ts'
import { isNestedOrdinaryPath, isValidContentDate, requiresContentDate } from '../lib/ordinary.ts'
import { siteConfig } from '../site.config.ts'

const ROOT = cwd()
const CONTENT_DIR = join(ROOT, 'content')
const MODE = argv[2]
const OPTIONS = argv.slice(3)
const LANG = OPTIONS.includes('--ko') ? 'ko' : 'en'
const VALID_RULES = new Set(['topics', 'titleSlug', 'wikiLinks', 'media', 'encoding'])
const SUSPICIOUS_ENCODING_TOKENS = ['\uFFFD', '\u00C3', '\u00C2']
const DOCTOR_CONFIG = siteConfig.contentDoctor ?? {}
const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/
const INVISIBLE_TEXT_RE = /[\u200B\uFEFF]/g

const TEXT = {
  en: {
    usage: 'Usage: node scripts/content-doctor.mjs <check|fix> [--ko]',
    typeIndexCannotUseTopics: 'type: index cannot use topics frontmatter',
    missingTopics: 'missing topics frontmatter',
    unsupportedDraft: 'draft frontmatter is no longer supported; publish only files in VAULT_PUBLISH',
    missingDate: 'missing date frontmatter',
    invalidDate: (date) => `invalid date: ${date}`,
    nestedOrdinary: 'ordinary posts must be stored directly under content/ordinary',
    suspiciousTitle: (title) => `suspicious title derived from filename: "${title}"`,
    unsupportedType: (type) => `unsupported type: ${type}`,
    duplicateSlug: (slug) => `duplicate slug after normalization: ${slug}`,
    typeIndexCannotDeclareParent: 'type: index cannot declare parent',
    typeIndexCannotDeclareOrder: 'type: index cannot declare order',
    orderRequiresParent: 'order requires parent',
    parentRequiresOrder: (parent) => `order is required when parent is set: ${parent}`,
    invalidOrder: 'order must be a positive integer',
    duplicateOrder: (order, existing) => `duplicate order ${order} with ${existing}`,
    parentCannotReferenceItself: (parent) => `parent cannot reference itself: ${parent}`,
    missingParent: (parent) => `missing parent: ${parent}`,
    parentMustReferenceIndex: (parent) => `parent must reference type: index post: ${parent}`,
    brokenWikiLink: (target) => `broken wiki link: [[${target}]]`,
    audioAndYoutubeDirectives: 'audio and youtube directives cannot be used together',
    invalidYouTubeId: (id) => `invalid YouTube id: ${id}`,
    youtubeAndAudioSrc: 'youtubeId and audioSrc cannot be used together',
    invalidAudioSrc: (src) => `invalid audio src: ${src}`,
    audioTitleRequired: 'audioTitle required',
    audioTitleRequiresAudioSrc: 'audioTitle requires audioSrc',
    invisibleText: 'invisible zero-width characters should be removed',
    possibleBrokenEncoding: 'possible broken encoding',
    fixedFile: (rel) => `fixed ${rel}`,
    noIssuesFound: 'content doctor: no issues found',
    clean: 'content doctor: clean',
    changedFiles: (count) => `changed files: ${count}`,
  },
  ko: {
    usage: '사용법: node scripts/content-doctor.mjs <check|fix> [--ko]',
    typeIndexCannotUseTopics: 'type: index는 topics frontmatter를 사용할 수 없습니다',
    missingTopics: 'topics frontmatter가 없습니다',
    unsupportedDraft: 'draft frontmatter는 더 이상 지원하지 않습니다. VAULT_PUBLISH에 있는 파일만 공개됩니다',
    missingDate: 'date frontmatter가 없습니다',
    invalidDate: (date) => `잘못된 date입니다: ${date}`,
    nestedOrdinary: 'ordinary 글은 content/ordinary 바로 아래에 저장해야 합니다',
    suspiciousTitle: (title) => `파일명에서 가져온 title이 의심스럽습니다: "${title}"`,
    unsupportedType: (type) => `지원하지 않는 type입니다: ${type}`,
    duplicateSlug: (slug) => `정규화 후 slug가 중복됩니다: ${slug}`,
    typeIndexCannotDeclareParent: 'type: index는 parent를 선언할 수 없습니다',
    typeIndexCannotDeclareOrder: 'type: index는 order를 선언할 수 없습니다',
    orderRequiresParent: 'order에는 parent가 필요합니다',
    parentRequiresOrder: (parent) => `parent가 있으면 order가 필요합니다: ${parent}`,
    invalidOrder: 'order는 양의 정수여야 합니다',
    duplicateOrder: (order, existing) => `order ${order}가 ${existing}와 중복됩니다`,
    parentCannotReferenceItself: (parent) => `parent가 자기 자신을 참조할 수 없습니다: ${parent}`,
    missingParent: (parent) => `parent를 찾을 수 없습니다: ${parent}`,
    parentMustReferenceIndex: (parent) => `parent는 type: index post를 참조해야 합니다: ${parent}`,
    brokenWikiLink: (target) => `깨진 wiki link입니다: [[${target}]]`,
    audioAndYoutubeDirectives: 'audio directive와 youtube directive를 함께 사용할 수 없습니다',
    invalidYouTubeId: (id) => `잘못된 YouTube id입니다: ${id}`,
    youtubeAndAudioSrc: 'youtubeId와 audioSrc를 함께 사용할 수 없습니다',
    invalidAudioSrc: (src) => `잘못된 audio src입니다: ${src}`,
    audioTitleRequired: 'audioTitle이 필요합니다',
    audioTitleRequiresAudioSrc: 'audioTitle에는 audioSrc가 필요합니다',
    invisibleText: '보이지 않는 zero-width 문자를 제거해야 합니다',
    possibleBrokenEncoding: 'encoding이 깨졌을 수 있습니다',
    fixedFile: (rel) => `수정됨 ${rel}`,
    noIssuesFound: 'content doctor: 문제가 없습니다',
    clean: 'content doctor: 깨끗합니다',
    changedFiles: (count) => `변경된 파일: ${count}`,
  },
}

const t = TEXT[LANG]

if ((MODE !== 'check' && MODE !== 'fix') || OPTIONS.some((option) => option !== '--ko')) {
  console.error(t.usage)
  exit(2)
}

function normalizeWikiTarget(target) {
  return target
    .trim()
    .split('/')
    .map((part) => part.trim().replace(/\s+/g, '-'))
    .filter(Boolean)
    .join('/')
}

async function listMarkdownFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await listMarkdownFiles(path)))
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(path)
    }
  }

  return files
}

function splitFrontmatter(source) {
  const open = source.match(/^---\r?\n/)
  if (!open) {
    return { matter: null, body: source, start: '', end: '' }
  }

  const closeRe = /\r?\n---(?:\r?\n|$)/g
  closeRe.lastIndex = open[0].length
  const close = closeRe.exec(source)
  if (!close) return { matter: null, body: source, start: '', end: '' }

  return {
    matter: source.slice(open[0].length, close.index),
    body: source.slice(close.index + close[0].length),
    start: open[0],
    end: close[0],
  }
}

function parseFrontmatter(matter) {
  const data = {}
  if (matter === null) return data

  const lines = matter.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const scalar = line.match(/^([A-Za-z][\w-]*):\s*(.*?)\s*$/)
    if (!scalar) continue

    const key = scalar[1]
    const value = scalar[2]
    if (value === '') {
      const list = []
      let j = i + 1
      while (j < lines.length) {
        const item = lines[j].match(/^\s*-\s*(.*?)\s*$/)
        if (!item) break
        list.push(unquote(item[1]))
        j++
      }
      data[key] = list
      i = j - 1
    } else if (value.startsWith('[') && value.endsWith(']')) {
      data[key] = value
        .slice(1, -1)
        .split(',')
        .map((item) => unquote(item.trim()))
        .filter(Boolean)
    } else {
      data[key] = unquote(value)
    }
  }

  return data
}

function unquote(value) {
  return value.replace(/^(['"])(.*)\1$/, '$2')
}

function yamlScalar(value) {
  if (/^[A-Za-z0-9_./:%?&=#@+-]+$/.test(value)) return value
  return JSON.stringify(value)
}

function parseOrder(matter) {
  if (matter === null) return undefined
  const match = matter.match(/^order:\s*(.*?)\s*$/m)
  if (!match) return undefined
  if (!/^[1-9]\d*$/.test(match[1])) return null
  return Number(match[1])
}

function stringifyFrontmatter(data) {
  const lines = []
  if (data.date) lines.push(`date: ${yamlScalar(data.date)}`)
  if (data.type) lines.push(`type: ${yamlScalar(data.type)}`)
  if (data.parent) lines.push(`parent: ${yamlScalar(data.parent)}`)
  if (data.order !== undefined) lines.push(`order: ${yamlScalar(data.order)}`)
  if ((data.topics ?? []).length === 0) {
    lines.push('topics: []')
  } else {
    lines.push('topics:')
    for (const topic of data.topics) lines.push(`  - ${topic}`)
  }
  if (data.youtubeId) lines.push(`youtubeId: ${yamlScalar(data.youtubeId)}`)
  if (data.audioSrc) lines.push(`audioSrc: ${yamlScalar(data.audioSrc)}`)
  if (data.audioTitle) lines.push(`audioTitle: ${yamlScalar(data.audioTitle)}`)
  return lines.join('\n')
}

function stripFencedCode(source) {
  return source.replace(/(^|\n)(`{3,}|~{3,})[\s\S]*?\n\2(?=\n|$)/g, '$1')
}

function extractWikiLinks(source) {
  return Array.from(source.matchAll(/\[\[([^\]\n]+?)\]\]/g))
    .map((match) => normalizeWikiTarget(match[1].split('|')[0]))
    .filter(Boolean)
}

function slugForFile(file) {
  return publicSlugForContentPath(relative(CONTENT_DIR, file))
}

function titleForFile(file) {
  return titleForContentPath(basename(file, extname(file)))
}

function normalizePath(value) {
  return value.replace(/\\/g, '/').replace(/^content\//, '')
}

function configSet(values = []) {
  return new Set(values.map((value) => normalizeWikiTarget(normalizePath(value))))
}

const IGNORED_FILES = configSet(DOCTOR_CONFIG.ignoreFiles)

function ignoredRulesFor(map = {}, key) {
  const rules = map[key] ?? []
  return new Set(rules.filter((rule) => VALID_RULES.has(rule)))
}

function getExceptionContext(file, slug) {
  const fileKey = normalizeWikiTarget(normalizePath(relative(CONTENT_DIR, file)))
  return {
    ignored: slug === siteConfig.homeSlug || isHomeLinkPagePath(fileKey) || IGNORED_FILES.has(fileKey),
    ignoredRules: new Set([
      ...ignoredRulesFor(DOCTOR_CONFIG.ignoreRulesBySlug, slug),
      ...ignoredRulesFor(DOCTOR_CONFIG.ignoreRulesByFile, fileKey),
    ]),
  }
}

function addIssue(issues, severity, file, message) {
  issues.push({ severity, file, message })
}

function applyFixes(source, data, parts) {
  if (parts.matter === null) {
    return `---\n${stringifyFrontmatter(data)}\n---\n${parts.body}`
  }
  return `${parts.start}${stringifyFrontmatter(data)}${parts.end}${parts.body}`
}

function removeInvisibleText(value) {
  return value.replace(INVISIBLE_TEXT_RE, '')
}

function isSafeAudioSrc(value) {
  if (value.startsWith('/') && !value.startsWith('//') && !/[^\S\r\n]/.test(value)) return true
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

async function main() {
  if (!existsSync(CONTENT_DIR)) throw new Error(`Missing content directory: ${CONTENT_DIR}`)

  const files = await listMarkdownFiles(CONTENT_DIR)
  const postsBySlug = new Map()
  const postsByRef = new Map()
  for (const file of files) {
    const slug = slugForFile(file)
    const source = await readFile(file, 'utf8')
    const data = parseFrontmatter(splitFrontmatter(source).matter)
    if (!postsBySlug.has(slug)) postsBySlug.set(slug, [])
    postsBySlug.get(slug).push({ file, data })
    postsByRef.set(normalizePath(relative(CONTENT_DIR, file)).replace(/\.md$/, ''), { file, data })
  }
  const knownSlugs = new Set(postsBySlug.keys())
  const slugCounts = new Map()
  for (const file of files) slugCounts.set(slugForFile(file), (slugCounts.get(slugForFile(file)) ?? 0) + 1)

  const issues = []
  const ordersByParent = new Map()
  let changed = 0

  for (const file of files) {
    const source = await readFile(file, 'utf8')
    const parts = splitFrontmatter(source)
    const data = parseFrontmatter(parts.matter)
    const order = parseOrder(parts.matter)
    const markdownBody = stripFencedCode(parts.body)
    const rel = relative(ROOT, file)
    const slug = slugForFile(file)
    const contentPath = normalizePath(relative(CONTENT_DIR, file))
    const contentRef = contentPath.replace(/\.md$/, '')
    const exceptions = getExceptionContext(file, slug)
    if (data.draft !== undefined) {
      addIssue(issues, 'error', file, t.unsupportedDraft)
    }
    if (exceptions.ignored) continue

    const checks = {
      topics: !exceptions.ignoredRules.has('topics'),
      titleSlug: !exceptions.ignoredRules.has('titleSlug'),
      wikiLinks: !exceptions.ignoredRules.has('wikiLinks'),
      media: !exceptions.ignoredRules.has('media'),
      encoding: !exceptions.ignoredRules.has('encoding'),
    }
    let dirty = false

    if (isNestedOrdinaryPath(contentPath)) {
      addIssue(issues, 'error', file, t.nestedOrdinary)
    }
    if (data.date !== undefined && !isValidContentDate(data.date)) {
      addIssue(issues, 'error', file, t.invalidDate(data.date))
    } else if (requiresContentDate(contentPath, data.type, siteConfig.homeSlug) && data.date === undefined) {
      addIssue(issues, 'error', file, t.missingDate)
    }

    if (checks.topics && data.type === 'index' && data.topics !== undefined) {
      addIssue(issues, 'error', file, t.typeIndexCannotUseTopics)
    } else if (checks.topics && data.type !== 'index' && !Array.isArray(data.topics)) {
      addIssue(issues, 'fixable', file, t.missingTopics)
      data.topics = []
      dirty = true
    }

    if (checks.titleSlug) {
      const title = titleForFile(file)
      if (title !== title.trim() || /\s{2,}/.test(title)) {
        addIssue(issues, 'warn', file, t.suspiciousTitle(title))
      }
      if (data.type !== undefined && data.type !== 'index') {
        addIssue(issues, 'error', file, t.unsupportedType(data.type))
      }
      if (slugCounts.get(slug) > 1) {
        addIssue(issues, 'error', file, t.duplicateSlug(slug))
      }
      if (data.type === 'index' && data.parent) {
        addIssue(issues, 'error', file, t.typeIndexCannotDeclareParent)
      }
      if (data.type === 'index' && order !== undefined) {
        addIssue(issues, 'error', file, t.typeIndexCannotDeclareOrder)
      } else if (!data.parent && order !== undefined) {
        addIssue(issues, 'error', file, t.orderRequiresParent)
      }
      if (data.parent) {
        const parent = postsByRef.get(data.parent)
        if (order === undefined) {
          addIssue(issues, 'error', file, t.parentRequiresOrder(data.parent))
        } else if (order === null) {
          addIssue(issues, 'error', file, t.invalidOrder)
        } else {
          const siblingOrders = ordersByParent.get(data.parent) ?? new Map()
          const existing = siblingOrders.get(order)
          if (existing) {
            addIssue(issues, 'error', file, t.duplicateOrder(order, existing))
          } else {
            siblingOrders.set(order, rel)
            ordersByParent.set(data.parent, siblingOrders)
          }
        }
        if (data.parent === contentRef) {
          addIssue(issues, 'error', file, t.parentCannotReferenceItself(data.parent))
        } else if (!parent) {
          addIssue(issues, 'error', file, t.missingParent(data.parent))
        } else if (parent.data.type !== 'index') {
          addIssue(issues, 'error', file, t.parentMustReferenceIndex(data.parent))
        }
      }
    }

    if (checks.wikiLinks) {
      for (const target of extractWikiLinks(markdownBody)) {
        if (!knownSlugs.has(target)) {
          addIssue(issues, 'error', file, t.brokenWikiLink(target))
        }
      }
    }

    if (checks.media) {
      if (data.youtubeId && data.audioSrc) {
        addIssue(issues, 'error', file, t.youtubeAndAudioSrc)
      }
      if (data.youtubeId && !YOUTUBE_ID_RE.test(data.youtubeId)) {
        addIssue(issues, 'error', file, t.invalidYouTubeId(data.youtubeId))
      }
      if (data.audioSrc && !isSafeAudioSrc(data.audioSrc)) {
        addIssue(issues, 'error', file, t.invalidAudioSrc(data.audioSrc))
      }
      if (data.audioSrc && !data.audioTitle?.trim()) {
        addIssue(issues, 'error', file, t.audioTitleRequired)
      }
      if (!data.audioSrc && data.audioTitle !== undefined) {
        addIssue(issues, 'error', file, t.audioTitleRequiresAudioSrc)
      }
    }

    if (checks.encoding) {
      if (INVISIBLE_TEXT_RE.test(source)) {
        addIssue(issues, 'fixable', file, t.invisibleText)
        parts.matter = parts.matter === null ? null : removeInvisibleText(parts.matter)
        parts.body = removeInvisibleText(parts.body)
        dirty = true
      }
      INVISIBLE_TEXT_RE.lastIndex = 0

      if (SUSPICIOUS_ENCODING_TOKENS.some((token) => source.includes(token))) {
        addIssue(issues, 'warn', file, t.possibleBrokenEncoding)
      }
    }

    if (MODE === 'fix' && dirty) {
      await writeFile(file, applyFixes(source, data, parts), 'utf8')
      changed++
      console.log(t.fixedFile(rel))
    }
  }

  if (issues.length === 0) {
    console.log(MODE === 'fix' ? t.noIssuesFound : t.clean)
    return
  }

  for (const issue of issues) {
    console.log(`[${issue.severity}] ${relative(ROOT, issue.file)} - ${issue.message}`)
  }
  if (MODE === 'fix') console.log(t.changedFiles(changed))

  if (issues.some((issue) => issue.severity === 'error' || (MODE === 'check' && issue.severity === 'fixable'))) {
    exit(1)
  }
}

main().catch((error) => {
  console.error(error)
  exit(1)
})

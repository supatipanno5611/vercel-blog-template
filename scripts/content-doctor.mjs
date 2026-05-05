import { existsSync } from 'node:fs'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { basename, extname, join, relative } from 'node:path'
import { argv, cwd, exit } from 'node:process'
import { siteConfig } from '../site.config.ts'

const ROOT = cwd()
const CONTENT_DIR = join(ROOT, 'content')
const MODE = argv[2]
const VALID_MEDIA = new Set(['audio', 'youtube'])
const VALID_RULES = new Set(['base', 'titleSlug', 'wikiLinks', 'media', 'encoding'])
const SUSPICIOUS_ENCODING_TOKENS = ['\uFFFD', '\u00C3', '\u00C2', '\u00EC', '\u00EB', '\u00ED', '\u00EA']
const DOCTOR_CONFIG = siteConfig.contentDoctor ?? {}

if (MODE !== 'check' && MODE !== 'fix') {
  console.error('Usage: node scripts/content-doctor.mjs <check|fix>')
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

function stringifyFrontmatter(data) {
  const lines = []
  if (data.draft !== undefined) lines.push(`draft: ${data.draft}`)
  if ((data.base ?? []).length === 0) {
    lines.push('base: []')
  } else {
    lines.push('base:')
    for (const base of data.base) lines.push(`  - ${base}`)
  }
  if (data.media) lines.push(`media: ${data.media}`)
  return lines.join('\n')
}

function detectMediaDirectives(body) {
  return {
    audio: /::audio\b/.test(body),
    youtube: /::youtube\b/.test(body),
  }
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
  return relative(CONTENT_DIR, file).replace(/\\/g, '/').replace(/\.md$/, '').replace(/\s+/g, '-')
}

function titleForFile(file) {
  return basename(file, extname(file))
}

function normalizePath(value) {
  return value.replace(/\\/g, '/').replace(/^content\//, '')
}

function configSet(values = []) {
  return new Set(values.map((value) => normalizeWikiTarget(normalizePath(value))))
}

const IGNORED_SLUGS = configSet(DOCTOR_CONFIG.ignoreSlugs)
const IGNORED_FILES = configSet(DOCTOR_CONFIG.ignoreFiles)

function ignoredRulesFor(map = {}, key) {
  const rules = map[key] ?? []
  return new Set(rules.filter((rule) => VALID_RULES.has(rule)))
}

function getExceptionContext(file, slug) {
  const fileKey = normalizeWikiTarget(normalizePath(relative(CONTENT_DIR, file)))
  return {
    ignored: IGNORED_SLUGS.has(slug) || IGNORED_FILES.has(fileKey),
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
    return `---\n${stringifyFrontmatter(data)}\n---\n${source}`
  }
  return `${parts.start}${stringifyFrontmatter(data)}${parts.end}${parts.body}`
}

async function main() {
  if (!existsSync(CONTENT_DIR)) throw new Error(`Missing content directory: ${CONTENT_DIR}`)

  const files = await listMarkdownFiles(CONTENT_DIR)
  const knownSlugs = new Set(files.map(slugForFile))
  const slugCounts = new Map()
  for (const file of files) slugCounts.set(slugForFile(file), (slugCounts.get(slugForFile(file)) ?? 0) + 1)

  const issues = []
  let changed = 0

  for (const file of files) {
    const source = await readFile(file, 'utf8')
    const parts = splitFrontmatter(source)
    const data = parseFrontmatter(parts.matter)
    const markdownBody = stripFencedCode(parts.body)
    const directives = detectMediaDirectives(markdownBody)
    const rel = relative(ROOT, file)
    const slug = slugForFile(file)
    const exceptions = getExceptionContext(file, slug)
    if (exceptions.ignored) continue

    const checks = {
      base: !exceptions.ignoredRules.has('base'),
      titleSlug: !exceptions.ignoredRules.has('titleSlug'),
      wikiLinks: !exceptions.ignoredRules.has('wikiLinks'),
      media: !exceptions.ignoredRules.has('media'),
      encoding: !exceptions.ignoredRules.has('encoding'),
    }
    let dirty = false

    if (checks.base && !Array.isArray(data.base)) {
      addIssue(issues, 'fixable', file, 'missing base frontmatter')
      data.base = []
      dirty = true
    }

    if (checks.titleSlug) {
      const title = titleForFile(file)
      if (title !== title.trim() || /\s{2,}/.test(title)) {
        addIssue(issues, 'warn', file, `suspicious title derived from filename: "${title}"`)
      }
      if (slugCounts.get(slug) > 1) {
        addIssue(issues, 'error', file, `duplicate slug after normalization: ${slug}`)
      }
    }

    if (checks.wikiLinks) {
      for (const target of extractWikiLinks(markdownBody)) {
        if (!knownSlugs.has(target)) {
          addIssue(issues, 'error', file, `broken wiki link: [[${target}]]`)
        }
      }
    }

    const directiveTypes = [directives.audio && 'audio', directives.youtube && 'youtube'].filter(Boolean)
    if (checks.media) {
      if (data.media !== undefined && !VALID_MEDIA.has(data.media)) {
        addIssue(issues, 'error', file, `invalid media value: ${data.media}`)
      }
      if (directiveTypes.length > 1) {
        addIssue(issues, 'error', file, 'audio and youtube directives cannot be used together')
      } else if (directiveTypes.length === 1 && data.media === undefined) {
        addIssue(issues, 'fixable', file, `missing media frontmatter; expected ${directiveTypes[0]}`)
        data.media = directiveTypes[0]
        dirty = true
      } else if (directiveTypes.length === 1 && data.media !== directiveTypes[0]) {
        addIssue(issues, 'error', file, `media is ${data.media}, but directive is ${directiveTypes[0]}`)
      } else if (directiveTypes.length === 0 && data.media !== undefined) {
        addIssue(issues, 'error', file, `media is ${data.media}, but no matching directive exists`)
      }
    }

    if (checks.encoding && SUSPICIOUS_ENCODING_TOKENS.some((token) => source.includes(token))) {
      addIssue(issues, 'warn', file, 'possible broken Korean encoding')
    }

    if (MODE === 'fix' && dirty) {
      await writeFile(file, applyFixes(source, data, parts), 'utf8')
      changed++
      console.log(`fixed ${rel}`)
    }
  }

  if (issues.length === 0) {
    console.log(MODE === 'fix' ? 'content doctor: no issues found' : 'content doctor: clean')
    return
  }

  for (const issue of issues) {
    console.log(`[${issue.severity}] ${relative(ROOT, issue.file)} - ${issue.message}`)
  }
  if (MODE === 'fix') console.log(`changed files: ${changed}`)

  if (issues.some((issue) => issue.severity === 'error' || (MODE === 'check' && issue.severity === 'fixable'))) {
    exit(1)
  }
}

main().catch((error) => {
  console.error(error)
  exit(1)
})

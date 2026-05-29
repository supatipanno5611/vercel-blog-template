import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { basename, dirname, join, relative, resolve } from 'node:path'
import { argv, cwd, env, exit, stdin, stdout } from 'node:process'
import readline from 'node:readline/promises'
import { publicSlugForContentPath } from '../lib/home-link-pages.ts'
import { isSafeAudioSrc, YOUTUBE_ID_RE } from '../lib/markdown-security.ts'
import { isNestedOrdinaryPath, isValidContentDate, requiresContentDate } from '../lib/ordinary.ts'
import { siteConfig } from '../site.config.ts'

const ROOT = cwd()
const SOURCE_ROOT = resolve(env.VAULT_PUBLISH ?? getRequiredConfig('VAULT_PUBLISH'))
const TARGET_ROOT = resolve(env.VERCEL_CONTENT ?? join(ROOT, 'content'))
const SOURCE_ROOT_NAME = basename(SOURCE_ROOT)
const CHECK_ONLY = argv.includes('--check')
const AUTO_YES = argv.includes('--yes')
const EXCLUDED_DIRS = new Set(['.git', '.obsidian', '.trash', 'node_modules'])
const ALLOWED_ARGS = new Set(['--check', '--yes'])

function getRequiredConfig(name) {
  const value = siteConfig[name]
  if (!value) throw new Error(`${name} must be set before running sync.`)
  return value
}

async function main() {
  validateArgs()
  if (!existsSync(SOURCE_ROOT)) {
    throw new Error(`Source folder does not exist: ${SOURCE_ROOT}`)
  }

  const sourceFiles = await scanMarkdownFiles(SOURCE_ROOT, { normalizeParent: true })
  await validateSourceFiles(sourceFiles)

  await mkdir(TARGET_ROOT, { recursive: true })

  const targetFiles = await scanMarkdownFiles(TARGET_ROOT)
  const plan = buildPublishPlan(sourceFiles, targetFiles)

  printPlan(plan)

  if (CHECK_ONLY) {
    exit(planHasWork(plan) ? 1 : 0)
  }

  if (!planHasWork(plan)) {
    console.log('No changes.')
    return
  }

  if (!AUTO_YES) {
    const rl = readline.createInterface({ input: stdin, output: stdout })
    const answer = await rl.question('Apply this sync plan? [y/N] ')
    rl.close()
    if (answer.trim().toLowerCase() !== 'y') {
      console.log('Canceled.')
      return
    }
  }

  await applyPlan(plan)
  console.log('Sync complete.')
}

function validateArgs() {
  const args = argv.slice(2)
  for (const arg of args) {
    if (arg === '--init') throw new Error('--init is no longer supported. Sync is now source-to-target publish-copy.')
    if (!ALLOWED_ARGS.has(arg)) throw new Error(`Unknown option: ${arg}`)
  }
}

async function scanMarkdownFiles(root, options = {}) {
  const files = new Map()
  await scanDir(root, root, files, options)
  return files
}

async function scanDir(root, dir, files, options) {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry.name)) {
        await scanDir(root, join(dir, entry.name), files, options)
      }
      continue
    }

    if (!entry.isFile() || !entry.name.endsWith('.md')) continue

    const path = join(dir, entry.name)
    const key = toRelativeKey(root, path)
    const content = options.normalizeParent
      ? normalizeParentFrontmatter(await readFile(path, 'utf8'), { strict: false })
      : await readFile(path)
    files.set(key, {
      key,
      path,
      hash: sha256(content),
    })
  }
}

function toRelativeKey(root, path) {
  return relative(root, path).replace(/\\/g, '/')
}

function sha256(content) {
  return createHash('sha256').update(content).digest('hex')
}

function buildPublishPlan(sourceFiles, targetFiles) {
  const plan = emptyPlan()
  const keys = allKeys(sourceFiles, targetFiles)

  for (const key of keys) {
    const source = sourceFiles.get(key)
    const target = targetFiles.get(key)

    if (source && (!target || source.hash !== target.hash)) {
      const to = target?.path ?? targetPathFor(key)
      plan.copySourceToTarget.push({ key, from: source.path, to })
      continue
    }

    if (!source && target) {
      plan.deleteTarget.push({ key, path: target.path })
    }
  }

  return plan
}

function emptyPlan() {
  return {
    copySourceToTarget: [],
    deleteTarget: [],
  }
}

function allKeys(...collections) {
  const keys = new Set()
  for (const collection of collections) {
    for (const key of collection.keys()) keys.add(key)
  }
  return [...keys].sort()
}

function targetPathFor(key) {
  return join(TARGET_ROOT, ...key.split('/'))
}

function planHasWork(plan) {
  return (
    plan.copySourceToTarget.length > 0 ||
    plan.deleteTarget.length > 0
  )
}

function printPlan(plan) {
  console.log('Publish-copy plan:')
  printGroup('Copy source -> target', plan.copySourceToTarget, (item) => item.key)
  printGroup('Delete target', plan.deleteTarget, (item) => item.key)
}

function printGroup(label, items, format) {
  if (items.length === 0) return
  console.log(`\n${label}:`)
  for (const item of items) console.log(`  - ${format(item)}`)
}

async function validateSourceFiles(sourceFiles) {
  const errors = []
  const posts = []
  const postsBySlug = new Map()
  const postsByRef = new Map()

  for (const file of sourceFiles.values()) {
    const source = await readFile(file.path, 'utf8')
    const frontmatter = parseFrontmatter(source)
    const data = parseFrontmatterData(frontmatter)
    const normalizedParent = normalizeParentRef(data.parent)
    if (normalizedParent.error) {
      errors.push(`${file.key}: unsupported parent wikilink: ${data.parent}`)
    } else if (normalizedParent.value) {
      data.parent = normalizedParent.value
    }
    const slug = publicSlugForContentPath(file.key)
    const fileErrors = validateMarkdownOnly(source, file.key)
    for (const error of fileErrors) errors.push(`${file.key}: ${error}`)

    const existing = postsBySlug.get(slug)
    if (existing) {
      errors.push(`${file.key}: duplicate slug after normalization: ${existing.key} and ${file.key} both map to ${slug}`)
    } else {
      postsBySlug.set(slug, { key: file.key, data })
    }
    const post = { key: file.key, ref: file.key.replace(/\.md$/, ''), slug, data, order: parseOrder(frontmatter) }
    postsByRef.set(post.ref, post)
    posts.push(post)
  }

  validateContentRelationships(posts, postsByRef, errors)

  if (errors.length > 0) {
    throw new Error(`Markdown-only validation failed:\n- ${errors.join('\n- ')}`)
  }
}

function validateContentRelationships(posts, postsByRef, errors) {
  const ordersByParent = new Map()

  for (const post of posts) {
    if (post.data.type === 'index' && post.data.parent) {
      errors.push(`${post.key}: type: index cannot declare parent`)
    }
    if (post.data.type === 'index' && post.order !== undefined) {
      errors.push(`${post.key}: type: index cannot declare order`)
    } else if (!post.data.parent && post.order !== undefined) {
      errors.push(`${post.key}: order cannot be declared without parent`)
    }
    if (!post.data.parent) continue
    if (post.order === undefined) {
      errors.push(`${post.key}: order is required when parent is set: ${post.data.parent}`)
    } else if (post.order === null) {
      errors.push(`${post.key}: order must be a positive integer`)
    } else {
      const siblingOrders = ordersByParent.get(post.data.parent) ?? new Map()
      const existing = siblingOrders.get(post.order)
      if (existing) {
        errors.push(`${post.key}: duplicate order ${post.order} with ${existing}`)
      } else {
        siblingOrders.set(post.order, post.key)
        ordersByParent.set(post.data.parent, siblingOrders)
      }
    }

    const parent = postsByRef.get(post.data.parent)
    if (post.data.parent === post.ref) {
      errors.push(`${post.key}: parent cannot reference itself: ${post.data.parent}`)
    } else if (!parent) {
      errors.push(`${post.key}: missing parent: ${post.data.parent}`)
    } else if (parent.data.type !== 'index') {
      errors.push(`${post.key}: parent must reference type: index post: ${post.data.parent}`)
    }
  }
}

function validateMarkdownOnly(source, key) {
  const errors = []
  const markdownBody = stripFencedCode(source)
  const frontmatter = parseFrontmatter(source)
  const data = parseFrontmatterData(frontmatter)

  if (data.draft !== undefined) {
    errors.push('draft frontmatter is no longer supported; publish only files in VAULT_PUBLISH')
  }
  if (isNestedOrdinaryPath(key)) {
    errors.push('ordinary posts must be stored directly under content/ordinary')
  }
  if (data.date !== undefined && !isValidContentDate(data.date)) {
    errors.push(`invalid date: ${data.date}`)
  } else if (requiresContentDate(key, data.type, siteConfig.homeSlug) && data.date === undefined) {
    errors.push('date frontmatter is required for readable posts')
  }

  if (/^\s*(?:import|export)\s/m.test(markdownBody)) {
    errors.push('import/export is not allowed')
  }
  if (/(^|[\s(>])\{[^}\n]+\}/.test(markdownBody)) {
    errors.push('MDX expressions are not allowed')
  }
  if (/<[A-Za-z][^>]*>/.test(markdownBody)) {
    errors.push('raw HTML/JSX is not allowed')
  }
  for (const match of markdownBody.matchAll(/::([A-Za-z][\w-]*)\b/g)) {
    errors.push(`unsupported directive: ${match[1]}`)
  }
  if (data.type !== undefined && data.type !== 'index') {
    errors.push(`unsupported type: ${data.type}`)
  }
  if (data.type === 'index' && data.topics !== undefined) {
    errors.push('type: index cannot use topics frontmatter')
  }
  if (data.youtubeId && data.audioSrc) {
    errors.push('youtubeId and audioSrc cannot be used together')
  }
  if (data.youtubeId && !YOUTUBE_ID_RE.test(data.youtubeId)) {
    errors.push(`invalid YouTube id: ${data.youtubeId}`)
  }
  if (data.audioSrc && !isSafeAudioSrc(data.audioSrc)) {
    errors.push(`invalid audio src: ${data.audioSrc}`)
  }
  if (data.audioSrc && !data.audioTitle?.trim()) {
    errors.push('audioTitle is required when audioSrc is set')
  }
  if (!data.audioSrc && data.audioTitle !== undefined) {
    errors.push('audioTitle requires audioSrc')
  }

  return errors
}

function stripFencedCode(source) {
  return source.replace(/(^|\n)(`{3,}|~{3,})[\s\S]*?\n\2(?=\n|$)/g, '$1')
}

function parseFrontmatter(source) {
  const open = source.match(/^---\r?\n/)
  if (!open) return ''
  const closeRe = /\r?\n---(?:\r?\n|$)/g
  closeRe.lastIndex = open[0].length
  const close = closeRe.exec(source)
  if (!close) return ''
  return source.slice(open[0].length, close.index)
}

function parseFrontmatterData(frontmatter) {
  const data = {}
  for (const line of frontmatter.split(/\r?\n/)) {
    const scalar = line.match(/^([A-Za-z][\w-]*):\s*(.*?)\s*$/)
    if (!scalar) continue
    data[scalar[1]] = unquote(scalar[2])
  }
  return data
}

function normalizeParentRef(value) {
  if (!value) return { value }

  let parent = value.trim().replace(/\\/g, '/')
  const wikiLink = parent.match(/^\[\[([^\]|#^\n]+)\]\]$/)
  if (/^\[\[/.test(parent)) {
    if (!wikiLink) return { value: parent, error: true }
    parent = wikiLink[1].trim()
  }

  parent = parent.replace(/\.md$/i, '')
  if (parent === SOURCE_ROOT_NAME) return { value: '' }
  if (parent.startsWith(`${SOURCE_ROOT_NAME}/`)) parent = parent.slice(SOURCE_ROOT_NAME.length + 1)
  return { value: parent }
}

function yamlScalar(value) {
  if (/^[A-Za-z0-9_./:%?&=#@+-]+$/.test(value)) return value
  return JSON.stringify(value)
}

function normalizeParentFrontmatter(source, { strict }) {
  const open = source.match(/^---\r?\n/)
  if (!open) return source

  const closeRe = /\r?\n---(?:\r?\n|$)/g
  closeRe.lastIndex = open[0].length
  const close = closeRe.exec(source)
  if (!close) return source

  const matter = source.slice(open[0].length, close.index)
  const normalizedMatter = matter.replace(/^parent:\s*(.*?)\s*$/m, (line, rawValue) => {
    const value = unquote(rawValue)
    const normalized = normalizeParentRef(value)
    if (normalized.error) {
      if (strict) throw new Error(`unsupported parent wikilink: ${value}`)
      return line
    }
    return normalized.value ? `parent: ${yamlScalar(normalized.value)}` : line
  })

  return `${source.slice(0, open[0].length)}${normalizedMatter}${source.slice(close.index)}`
}

function parseOrder(frontmatter) {
  const match = frontmatter.match(/^order:\s*(.*?)\s*$/m)
  if (!match) return undefined
  if (!/^[1-9]\d*$/.test(match[1])) return null
  return Number(match[1])
}

function unquote(value) {
  return value.replace(/^(['"])(.*)\1$/, '$2')
}

async function applyPlan(plan) {
  for (const item of plan.copySourceToTarget) await copyMarkdownFile(item.from, item.to)
  for (const item of plan.deleteTarget) await rm(item.path)
}

async function copyMarkdownFile(from, to) {
  await mkdir(dirname(to), { recursive: true })
  await writeFile(to, normalizeParentFrontmatter(await readFile(from, 'utf8'), { strict: true }))
}

main().catch((error) => {
  console.error(error.message ?? error)
  exit(1)
})

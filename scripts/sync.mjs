import { readdir, readFile, writeFile, unlink, stat, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { argv, cwd, env, stdin, stdout } from 'node:process'
import readline from 'node:readline/promises'

const ROOT = cwd()
const VAULT_PUBLISH = resolve(env.VAULT_PUBLISH ?? join(ROOT, '_publish'))
const VERCEL_CONTENT = resolve(env.VERCEL_CONTENT ?? join(ROOT, 'content'))
const MANIFEST_PATH = resolve(env.SYNC_MANIFEST ?? join(ROOT, '.sync-state.json'))

const AUTO_YES = argv.includes('--yes')
const MTIME_TOLERANCE_MS = 1000

const LABEL = {
  add: '새 글을 content에 추가',
  update: 'content 글 갱신',
  'delete-publish': 'content에서 사라진 글을 _publish에서도 삭제',
  'delete-vercel': '_publish에서 사라진 글을 content에서도 삭제',
  'warn-vercel-newer': 'content가 더 최신이라 건너뜀',
  'warn-orphan': 'content에만 있어서 건너뜀',
}

async function main() {
  if (!existsSync(VAULT_PUBLISH)) {
    throw new Error(`Publish folder does not exist: ${VAULT_PUBLISH}\nSet VAULT_PUBLISH to your Obsidian _publish folder.`)
  }

  const manifestSet = new Set(await loadManifest())
  await mkdir(VERCEL_CONTENT, { recursive: true })

  const publishSet = new Set(
    (await readdir(VAULT_PUBLISH))
      .filter((file) => file.endsWith('.md'))
      .map((file) => file.replace(/\.md$/, ''))
  )
  const vercelSet = new Set(
    (await readdir(VERCEL_CONTENT))
      .filter((file) => file.endsWith('.md'))
      .map((file) => file.replace(/\.md$/, ''))
  )

  const actions = []
  const allNames = new Set([...publishSet, ...vercelSet, ...manifestSet])

  for (const name of allNames) {
    const inPublish = publishSet.has(name)
    const inVercel = vercelSet.has(name)
    const inManifest = manifestSet.has(name)

    if (inPublish && inVercel) {
      const publishStat = await stat(join(VAULT_PUBLISH, `${name}.md`))
      const vercelStat = await stat(join(VERCEL_CONTENT, `${name}.md`))
      if (publishStat.mtimeMs > vercelStat.mtimeMs + MTIME_TOLERANCE_MS) {
        actions.push({ type: 'update', name })
      } else if (vercelStat.mtimeMs > publishStat.mtimeMs + MTIME_TOLERANCE_MS) {
        actions.push({ type: 'warn-vercel-newer', name })
      }
    } else if (inPublish && !inVercel && !inManifest) {
      actions.push({ type: 'add', name })
    } else if (inPublish && !inVercel && inManifest) {
      actions.push({ type: 'delete-publish', name })
    } else if (!inPublish && inVercel && inManifest) {
      actions.push({ type: 'delete-vercel', name })
    } else if (!inPublish && inVercel && !inManifest) {
      actions.push({ type: 'warn-orphan', name })
    }
  }

  if (actions.length === 0) {
    console.log('변경 사항 없음.')
    await saveCurrentManifest(publishSet, vercelSet)
    return
  }

  console.log('계획:')
  for (const action of actions) console.log(`  [${LABEL[action.type]}] ${action.name}`)

  if (!AUTO_YES) {
    const rl = readline.createInterface({ input: stdin, output: stdout })
    const answer = await rl.question('진행할까요? [y/N] ')
    rl.close()
    if (answer.trim().toLowerCase() !== 'y') {
      console.log('취소됨.')
      return
    }
  }

  for (const action of actions) {
    const publishPath = join(VAULT_PUBLISH, `${action.name}.md`)
    const vercelPath = join(VERCEL_CONTENT, `${action.name}.md`)

    switch (action.type) {
      case 'add':
        await syncMarkdownFile(publishPath, vercelPath)
        console.log(`  + content에 추가: ${action.name}`)
        break
      case 'update':
        await syncMarkdownFile(publishPath, vercelPath)
        console.log(`  ↻ content 갱신: ${action.name}`)
        break
      case 'delete-publish':
        await unlink(publishPath)
        console.log(`  - _publish에서 삭제: ${action.name}`)
        break
      case 'delete-vercel':
        await unlink(vercelPath)
        console.log(`  - content에서 삭제: ${action.name}`)
        break
      case 'warn-vercel-newer':
        console.warn(`  ! content가 더 최신입니다. 수동 편집 가능성이 있어 건너뜀: ${action.name}`)
        break
      case 'warn-orphan':
        console.warn(`  ! content에만 존재합니다. 추적된 파일이 아니라 건너뜀: ${action.name}`)
        break
    }
  }

  const finalPublish = new Set(
    (await readdir(VAULT_PUBLISH)).filter((file) => file.endsWith('.md')).map((file) => file.replace(/\.md$/, ''))
  )
  const finalVercel = new Set(
    (await readdir(VERCEL_CONTENT)).filter((file) => file.endsWith('.md')).map((file) => file.replace(/\.md$/, ''))
  )
  await saveCurrentManifest(finalPublish, finalVercel)
  console.log('완료.')
}

async function syncMarkdownFile(from, to) {
  const source = await readFile(from, 'utf8')
  const converted = convertLegacyMdxEmbeds(source)
  validateMarkdownOnly(converted, from)
  await writeFile(to, converted, 'utf8')
}

function convertLegacyMdxEmbeds(source) {
  return source
    .replace(/<YouTubeEmbed\s+([^>]*?)\/?>/gis, (_match, attrs) => {
      const id = getQuotedAttribute(attrs, 'id')
      if (!id) throw new Error('YouTubeEmbed is missing an id attribute')
      return `::youtube{id="${escapeDirectiveAttribute(id)}"}`
    })
    .replace(/<audio\b([^>]*)>(?:\s*<\/audio>)?/gis, (_match, attrs) => {
      const src = getQuotedAttribute(attrs, 'src')
      const title = getQuotedAttribute(attrs, 'title')
      if (!src) throw new Error('audio is missing a src attribute')
      const normalizedSrc = normalizeAudioSrc(src)
      const titlePart = title ? ` title="${escapeDirectiveAttribute(title)}"` : ''
      return `::audio{src="${escapeDirectiveAttribute(normalizedSrc)}"${titlePart}}`
    })
}

function normalizeAudioSrc(value) {
  const collapsed = value.replace(/\s+/g, ' ').trim()
  if (collapsed.startsWith('/')) return collapsed.replace(/ /g, '%20')
  return new URL(collapsed).href
}

function getQuotedAttribute(attrs, name) {
  const match = attrs.match(new RegExp(`\\b${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, 'i'))
  return match?.[2]
}

function escapeDirectiveAttribute(value) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, ' ')
}

function validateMarkdownOnly(source, filePath) {
  const errors = []

  if (/^\s*(?:import|export)\s/m.test(source)) {
    errors.push('import/export is not allowed')
  }
  if (/(^|[\s(>])\{[^}\n]+\}/.test(source)) {
    errors.push('MDX expressions are not allowed')
  }
  if (/<[A-Za-z][^>]*>/.test(source)) {
    errors.push('raw HTML/JSX is not allowed')
  }
  for (const match of source.matchAll(/::([A-Za-z][\w-]*)\b/g)) {
    if (match[1] !== 'youtube' && match[1] !== 'audio') {
      errors.push(`unsupported directive: ${match[1]}`)
    }
  }
  for (const match of source.matchAll(/::youtube\{[^}]*\bid="([^"]+)"[^}]*\}/g)) {
    if (!/^[A-Za-z0-9_-]{11}$/.test(match[1])) {
      errors.push(`invalid YouTube id: ${match[1]}`)
    }
  }
  for (const match of source.matchAll(/::audio\{[^}]*\bsrc="([^"]+)"[^}]*\}/g)) {
    if (!isSafeAudioSrc(match[1])) {
      errors.push(`invalid audio src: ${match[1]}`)
    }
  }

  if (errors.length > 0) {
    throw new Error(`Markdown-only validation failed for ${filePath}:\n- ${errors.join('\n- ')}`)
  }
}

function isSafeAudioSrc(value) {
  if (value.startsWith('/') && !value.startsWith('//') && !/[^\S\r\n]/.test(value)) return true
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

async function loadManifest() {
  if (!existsSync(MANIFEST_PATH)) return []
  try {
    const obj = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'))
    return Array.isArray(obj.files) ? obj.files : []
  } catch {
    return []
  }
}

async function saveCurrentManifest(publishSet, vercelSet) {
  const files = [...publishSet].filter((name) => vercelSet.has(name)).sort()
  await writeFile(MANIFEST_PATH, JSON.stringify({ files }, null, 2), 'utf8')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

import { readFile, writeFile } from 'node:fs/promises'
import { relative } from 'node:path'
import { argv, cwd, exit } from 'node:process'

const files = argv.slice(2)

if (files.length === 0) {
  console.error('Usage: node scripts/unwrap-markdown.mjs <file.md> [file.md ...]')
  exit(2)
}

function splitFrontmatter(source) {
  const open = source.match(/^---\r?\n/)
  if (!open) return { head: '', body: source }

  const closeRe = /\r?\n---(?:\r?\n|$)/g
  closeRe.lastIndex = open[0].length
  const close = closeRe.exec(source)
  if (!close) return { head: '', body: source }

  return {
    head: source.slice(0, close.index + close[0].length),
    body: source.slice(close.index + close[0].length),
  }
}

function isStructuralBlock(block) {
  return block
    .split('\n')
    .some((line) => /^(#{1,6}\s|[-*+]\s|\d+\.\s|>\s?|```|~~~|\|)/.test(line.trimStart()))
}

function unwrapBody(body) {
  const normalized = body.replace(/\r\n/g, '\n')
  const hasFinalNewline = normalized.endsWith('\n')
  const blocks = normalized.trimEnd().split(/\n{2,}/)

  const unwrapped = blocks
    .map((block) => {
      if (isStructuralBlock(block)) return block
      return block
        .split('\n')
        .map((line) => line.trim())
        .join(' ')
    })
    .join('\n\n')

  return hasFinalNewline ? `${unwrapped}\n` : unwrapped
}

for (const file of files) {
  const source = await readFile(file, 'utf8')
  const { head, body } = splitFrontmatter(source)
  const next = `${head}${unwrapBody(body)}`

  if (next !== source) {
    await writeFile(file, next, 'utf8')
    console.log(`unwrapped ${relative(cwd(), file)}`)
  }
}

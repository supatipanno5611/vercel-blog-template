import { visit } from 'unist-util-visit'
import type { Root, Text } from 'mdast'
import { normalizeWikiTarget } from './wiki-link'

type HtmlText = Text & {
  data: {
    hName: string
    hProperties?: Record<string, unknown>
  }
}

export function remarkWikiLink() {
  return (tree: Root) => {
    visit(tree, 'text', (node: Text, index, parent) => {
      if (!parent || index === undefined) return
      if (!node.value.includes('[[')) return

      const parts = node.value.split(/(\[\[.+?\]\])/g)
      if (parts.length === 1) return

      const newNodes: (HtmlText | Text)[] = parts
        .filter((p) => p !== '')
        .map((part) => {
          const match = part.match(/^\[\[(.+?)\]\]$/)
          if (!match) return { type: 'text', value: part }

          const [pageName, alias] = match[1].split('|')
          const href = '/' + normalizeWikiTarget(pageName)
          const label = alias?.trim() || pageName.trim()

          return {
            type: 'text',
            value: label,
            data: {
              hName: 'a',
              hProperties: {
                href,
                className: 'wiki-link',
              },
            },
          }
        })

      parent.children.splice(index, 1, ...newNodes)
      return index + newNodes.length
    })
  }
}

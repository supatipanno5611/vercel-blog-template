import { visit } from 'unist-util-visit'
import type { Root, Text } from 'mdast'

export function remarkWikiLink() {
  return (tree: Root) => {
    visit(tree, 'text', (node: Text, index, parent) => {
      if (!parent || index === undefined) return
      if (!node.value.includes('[[')) return

      const parts = node.value.split(/(\[\[.+?\]\])/g)
      if (parts.length === 1) return

      const newNodes: any[] = parts
        .filter((p) => p !== '')
        .map((part) => {
          const match = part.match(/^\[\[(.+?)\]\]$/)
          if (!match) return { type: 'text', value: part }

          const [pageName, alias] = match[1].split('|')
          const href = '/' + pageName.trim().toLowerCase().replace(/\s+/g, '-')
          const label = alias?.trim() || pageName.trim()

          return {
            type: 'mdxJsxTextElement',
            name: 'a',
            attributes: [
              { type: 'mdxJsxAttribute', name: 'href', value: href },
              { type: 'mdxJsxAttribute', name: 'className', value: 'wiki-link' },
            ],
            children: [{ type: 'text', value: label }],
          }
        })

      ;(parent as any).children.splice(index, 1, ...newNodes)
      return index + newNodes.length
    })
  }
}

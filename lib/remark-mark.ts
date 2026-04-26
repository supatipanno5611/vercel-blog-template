import { visit } from 'unist-util-visit'
import type { Root, Text } from 'mdast'

export function remarkMark() {
  return (tree: Root) => {
    visit(tree, 'text', (node: Text, index, parent) => {
      if (!parent || index === undefined) return
      if (!node.value.includes('==')) return

      const parts = node.value.split(/(==.+?==)/g)
      if (parts.length === 1) return

      const newNodes: any[] = parts
        .filter((p) => p !== '')
        .map((part) => {
          if (part.startsWith('==') && part.endsWith('==')) {
            return {
              type: 'mdxJsxTextElement',
              name: 'mark',
              attributes: [],
              children: [{ type: 'text', value: part.slice(2, -2) }],
            }
          }
          return { type: 'text', value: part }
        })

      ;(parent as any).children.splice(index, 1, ...newNodes)
      return index + newNodes.length
    })
  }
}

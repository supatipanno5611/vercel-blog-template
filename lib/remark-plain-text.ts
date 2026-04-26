import { visit } from 'unist-util-visit'
import type { Root } from 'mdast'

export function remarkPlainText() {
  return (tree: Root, file: any) => {
    const chunks: string[] = []

    visit(tree, (node) => {
      if (node.type === 'text' || node.type === 'inlineCode') {
        chunks.push((node as any).value)
      }
    })

    file.data.plainText = chunks.join(' ').replace(/\s+/g, ' ').slice(0, 3000)
  }
}
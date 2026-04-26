import { visit, SKIP } from 'unist-util-visit'
import type { Root, Blockquote } from 'mdast'

const CALLOUT_TYPES = new Set([
  'note', 'tip', 'info', 'warning', 'danger', 'error', 'bug',
  'success', 'question', 'failure', 'example', 'quote', 'abstract',
  'summary', 'todo', 'caution', 'hint', 'important',
])

export function remarkCallout() {
  return (tree: Root) => {
    visit(tree, 'blockquote', (node: Blockquote, index, parent) => {
      if (!parent || index === undefined) return

      const firstPara = node.children[0]
      if (!firstPara || firstPara.type !== 'paragraph') return

      const firstText = firstPara.children[0]
      if (!firstText || firstText.type !== 'text') return

      const match = firstText.value.match(/^\[!(\w+)\](?:[ \t]+([^\n]*))?\n?([\s\S]*)$/)
      if (!match) return

      const type = match[1].toLowerCase()
      if (!CALLOUT_TYPES.has(type)) return

      const title = match[2]?.trim() || (type.charAt(0).toUpperCase() + type.slice(1))
      const restContent = match[3]?.trimEnd() ?? ''

      // Modify first text node or remove it
      if (restContent) {
        firstText.value = restContent
      } else {
        firstPara.children.shift()
        if (firstPara.children.length === 0) {
          node.children.shift()
        }
      }

      const calloutNode: any = {
        type: 'mdxJsxFlowElement',
        name: 'div',
        attributes: [
          { type: 'mdxJsxAttribute', name: 'className', value: 'callout' },
          { type: 'mdxJsxAttribute', name: 'data-type', value: type },
        ],
        children: [
          {
            type: 'mdxJsxFlowElement',
            name: 'div',
            attributes: [{ type: 'mdxJsxAttribute', name: 'className', value: 'callout-title' }],
            children: [{ type: 'text', value: title }],
          },
          {
            type: 'mdxJsxFlowElement',
            name: 'div',
            attributes: [{ type: 'mdxJsxAttribute', name: 'className', value: 'callout-body' }],
            children: node.children,
          },
        ],
      }

      ;(parent as any).children[index] = calloutNode
      return SKIP
    })
  }
}

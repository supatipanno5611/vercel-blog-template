'use client'

import { Children, isValidElement, useState, type ReactNode } from 'react'
import ReactMarkdown, { defaultUrlTransform, type Components, type UrlTransform } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { isSafeHref } from '@/lib/markdown-security'
import { slugifyHeading, uniqueHeadingId } from '@/lib/heading-toc'
import { uiText } from '@/lib/ui-text'
import { remarkCallout } from '@/lib/remark-callout'
import { remarkChapter } from '@/lib/remark-chapter'
import { remarkCue } from '@/lib/remark-cue'
import { remarkMark } from '@/lib/remark-mark'
import { remarkMarkdownOnly } from '@/lib/remark-markdown-only'
import { remarkWikiLink } from '@/lib/remark-wiki-link'
import Chapter from './Chapter'
import Cue from './Cue'
import { CheckIcon, LinkIcon } from './icons'

type Props = {
  source: string
  enableHeadingAnchors?: boolean
}

function textFromChildren(children: ReactNode): string {
  return Children.toArray(children).map((child) => {
    if (typeof child === 'string' || typeof child === 'number') return String(child)
    if (isValidElement<{ children?: ReactNode }>(child)) return textFromChildren(child.props.children)
    return ''
  }).join('')
}

function CopyHeadingLink({ id }: { id: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <button
      type="button"
      className="heading-copy"
      aria-label={uiText.heading.copyLink}
      title={copied ? uiText.heading.copied : uiText.heading.copyLink}
      onClick={async () => {
        const url = decodeURI(`${window.location.origin}${window.location.pathname}#${id}`)
        await navigator.clipboard.writeText(url)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1200)
      }}
    >
      {copied ? <CheckIcon aria-hidden /> : <LinkIcon aria-hidden />}
    </button>
  )
}

function createComponents(enableHeadingAnchors: boolean) {
  const counts = new Map<string, number>()
  const heading = (Tag: 'h2' | 'h3' | 'h4') => {
    function Heading({ children }: { children?: ReactNode }) {
      if (!enableHeadingAnchors) return <Tag>{children}</Tag>
      const title = textFromChildren(children)
      const id = uniqueHeadingId(slugifyHeading(title), counts)
      return (
        <Tag id={id} className="heading-anchor">
          <span>{children}</span>
          <CopyHeadingLink id={id} />
        </Tag>
      )
    }
    return Heading
  }

  return {
  cue({ time, label, children }: { time?: string; label?: string; children?: React.ReactNode }) {
    if (!time || !label) return null
    return (
      <Cue time={time} label={label}>
        {children}
      </Cue>
    )
  },
  chapter({ time, label, title }: { time?: string; label?: string; title?: string }) {
    if (!time || !label || !title) return null
    return <Chapter time={time} label={label} title={title} />
  },
    h2: heading('h2'),
    h3: heading('h3'),
    h4: heading('h4'),
  } satisfies Partial<Components & Record<string, React.ComponentType<Record<string, unknown>>>>
}

const urlTransform: UrlTransform = (url, key, node) => {
  if (key === 'href' && node.tagName === 'a') return isSafeHref(url) ? url : null
  return defaultUrlTransform(url)
}

export function MarkdownContent({ source, enableHeadingAnchors = true }: Props) {
  const components = createComponents(enableHeadingAnchors)

  return (
    <ReactMarkdown
      remarkPlugins={[
        remarkGfm,
        remarkMarkdownOnly,
        remarkMark,
        remarkCallout,
        remarkWikiLink,
        remarkCue,
        remarkChapter,
      ]}
      skipHtml
      urlTransform={urlTransform}
      components={components as Components}
    >
      {source}
    </ReactMarkdown>
  )
}

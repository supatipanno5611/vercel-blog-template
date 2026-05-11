'use client'

import { Children, isValidElement, useState, type ReactNode } from 'react'
import ReactMarkdown, { defaultUrlTransform, type Components, type UrlTransform } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { isSafeHref } from '@/lib/markdown-security'
import { slugifyHeading, uniqueHeadingId } from '@/lib/heading-toc'
import { remarkCallout } from '@/lib/remark-callout'
import { remarkChapter } from '@/lib/remark-chapter'
import { remarkCue } from '@/lib/remark-cue'
import { remarkMark } from '@/lib/remark-mark'
import { remarkMarkdownOnly } from '@/lib/remark-markdown-only'
import { remarkWikiLink } from '@/lib/remark-wiki-link'
import Chapter from './Chapter'
import Cue from './Cue'

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
      aria-label="헤딩 링크 복사"
      title={copied ? '복사됨' : '헤딩 링크 복사'}
      onClick={async () => {
        const url = decodeURI(`${window.location.origin}${window.location.pathname}#${id}`)
        await navigator.clipboard.writeText(url)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1200)
      }}
    >
      {copied ? (
        <svg viewBox="0 0 20 20" fill="none" aria-hidden>
          <path d="M4.5 10.5l3.4 3.4 7.6-8.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 20 20" fill="none" aria-hidden>
          <path d="M7.5 10.5l-1 1a3 3 0 104.2 4.2l1.4-1.4M12.5 9.5l1-1a3 3 0 10-4.2-4.2L7.9 5.7M8 12l4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
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

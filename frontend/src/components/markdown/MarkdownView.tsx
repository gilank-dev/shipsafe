import { Children, Component, isValidElement, type ComponentPropsWithoutRef, type ReactNode } from 'react'
import Markdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { SEVERITIES } from '../../config/agents'
import type { Severity } from '../../domain/types'
import { SeverityTag } from '../ui/SeverityTag'
import { StatusTag } from '../ui/StatusTag'
import { CodeBlock } from './CodeBlock'

const SAFE_URL = /^https?:\/\//i

function textOf(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) => (typeof child === 'string' || typeof child === 'number' ? String(child) : ''))
    .join('')
    .trim()
}

function makeComponents(tableLabel: string): Components {
  return {
    // The page owns h1 and h2. Model headings are demoted so the outline stays valid.
    h1: ({ children }) => <h3>{children}</h3>,
    h2: ({ children }) => <h4>{children}</h4>,
    h3: ({ children }) => <h5>{children}</h5>,
    h4: ({ children }) => <h6>{children}</h6>,
    h5: ({ children }) => <h6>{children}</h6>,
    h6: ({ children }) => <h6>{children}</h6>,
    // Images are never fetched: a tracking pixel in model output would leak the reader's IP. Alt text only.
    img: ({ alt }) => <span>{alt ? `[image: ${alt}]` : '[image removed]'}</span>,
    a: ({ href, children }) => {
      if (!href || !SAFE_URL.test(href)) return <span>{children}</span>
      return (
        <a href={href} target="_blank" rel="noopener noreferrer nofollow">
          {children}
          <span className="visually-hidden"> (opens in new tab)</span>
        </a>
      )
    },
    table: ({ children }) => (
      <div className="md-scroll" role="region" tabIndex={0} aria-label={tableLabel}>
        <table>{children}</table>
      </div>
    ),
    th: ({ children }) => <th scope="col">{children}</th>,
    td: ({ children }) => {
      const value = textOf(children)
      if ((SEVERITIES as readonly string[]).includes(value)) return <td><SeverityTag level={value as Severity} /></td>
      if (value === 'Pass' || value === 'Partial' || value === 'Fail') return <td><StatusTag status={value} /></td>
      return <td>{children}</td>
    },
    pre: ({ children }) => {
      const child = Children.toArray(children)[0]
      if (isValidElement<ComponentPropsWithoutRef<'code'>>(child)) {
        const lang = /language-([\w-]+)/.exec(child.props.className ?? '')?.[1]
        return <CodeBlock code={textOf(child.props.children).replace(/\n$/, '')} label={lang ?? 'code'} />
      }
      return <pre>{children}</pre>
    },
  }
}

class Boundary extends Component<{ raw: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div>
        <p className="text-small text-ink-2">This text could not be formatted. Showing raw text.</p>
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-small">{this.props.raw}</pre>
      </div>
    )
  }
}

interface MarkdownViewProps {
  markdown: string
  tableLabel?: string
}

/**
 * The single render path for untrusted model text: GFM tables, no raw HTML (skipHtml, no rehype-raw),
 * no images, http(s) links only.
 */
export function MarkdownView({ markdown, tableLabel = 'Table, scrollable' }: MarkdownViewProps) {
  return (
    <Boundary raw={markdown}>
      <div className="md">
        <Markdown remarkPlugins={[remarkGfm]} skipHtml components={makeComponents(tableLabel)}>
          {markdown}
        </Markdown>
      </div>
    </Boundary>
  )
}

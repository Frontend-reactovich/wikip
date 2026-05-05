import DOMPurify from 'dompurify'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type MouseEvent,
} from 'react'

import { titleFromWikiHref } from '../wiki/parsoid'

type Props = {
  html: string
  slugByTitle: Map<string, string>
  onNavigateSlug: (slug: string) => void
}

export function ArticleBody({
  html,
  slugByTitle,
  onNavigateSlug,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)

  const sanitized = useMemo(() => {
    return DOMPurify.sanitize(html, {
      ADD_TAGS: [
        'section',
        'figure',
        'figcaption',
        'sup',
        'sub',
        'tbody',
        'thead',
        'table',
        'caption',
        'abbr',
        'time',
      ],
      ADD_ATTR: [
        'id',
        'class',
        'href',
        'title',
        'rel',
        'src',
        'srcset',
        'height',
        'width',
        'decoding',
        'loading',
        'typeof',
        'about',
        'resource',
        'cite',
        'scope',
        'colspan',
        'rowspan',
        'role',
        'style',
      ],
    })
  }, [html])

  const onClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      const a = (e.target as HTMLElement).closest('a')
      if (!a || !ref.current?.contains(a)) return
      const href = a.getAttribute('href')
      if (!href || /^https?:\/\//i.test(href) || href.startsWith('//'))
        return
      const t = titleFromWikiHref(href)
      if (!t) return
      const slug = slugByTitle.get(t)
      if (!slug) return
      e.preventDefault()
      onNavigateSlug(slug)
    },
    [slugByTitle, onNavigateSlug, ref],
  )

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.querySelectorAll('a[href^="./"]').forEach((node) => {
      const a = node as HTMLAnchorElement
      const t = titleFromWikiHref(a.getAttribute('href') ?? '')
      if (t && slugByTitle.has(t)) {
        a.setAttribute('data-in-cluster', 'true')
      }
    })
  }, [sanitized, slugByTitle, ref])

  return (
    <div
      ref={ref}
      className="wiki-html mw-parser-output"
      role="article"
      onClick={onClick}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  )
}

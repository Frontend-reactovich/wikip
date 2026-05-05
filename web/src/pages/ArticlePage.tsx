import { ReactFlowProvider } from '@xyflow/react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { ArticleBody } from '../components/ArticleBody'
import { NeighborGraph } from '../components/NeighborGraph'
import { loadArticleHtml } from '../wiki/catalog'
import type { EdgeEntry } from '../wiki/types'
import { neighborSlugs } from '../wiki/neighbors'

type Catalog = {
  slugByTitle: Map<string, string>
  titleBySlug: Map<string, string>
  edges: EdgeEntry[]
}

type Props = {
  baseUrl: string
  catalog: Catalog
}

export function ArticlePage({ baseUrl, catalog }: Props) {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<{ slug: string; html: string } | null>(null)
  const [fetchErr, setFetchErr] = useState<{
    slug: string
    message: string
  } | null>(null)

  const title = slug ? catalog.titleBySlug.get(slug) : undefined

  useEffect(() => {
    if (!slug || !catalog.titleBySlug.has(slug)) return
    let cancelled = false
    loadArticleHtml(baseUrl, slug)
      .then((html) => {
        if (!cancelled) {
          setData({ slug, html })
          setFetchErr(null)
        }
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setFetchErr({
            slug,
            message:
              e instanceof Error ? e.message : 'Не удалось загрузить статью',
          })
      })
    return () => {
      cancelled = true
    }
  }, [slug, baseUrl, catalog.titleBySlug])

  const html =
    data !== null && data.slug === slug ? data.html : null
  const err =
    fetchErr !== null && fetchErr.slug === slug
      ? fetchErr.message
      : null
  const loading = Boolean(
    slug &&
      data?.slug !== slug &&
      fetchErr?.slug !== slug,
  )

  const goSlug = useCallback(
    (s: string) => {
      navigate(`/wiki/${s}`)
    },
    [navigate],
  )

  if (!slug || !title) {
    return (
      <p className="error">
        Статья не найдена. <Link to="/">На главную</Link>
      </p>
    )
  }

  const nSlugs = neighborSlugs(
    slug,
    catalog.edges,
    catalog.slugByTitle,
    catalog.titleBySlug,
    6,
  )
  const neighbors = nSlugs.map((s) => ({
    slug: s,
    title: catalog.titleBySlug.get(s) ?? s,
  }))

  return (
    <div className="article-layout">
      <nav className="breadcrumbs" aria-label="Навигация">
        <Link to="/">Главная</Link>
        <span aria-hidden="true"> / </span>
        <span>{title}</span>
      </nav>

      <div className="article-split">
        <article className="article-main">
          <header className="article-title-row">
            <h1>{title}</h1>
            <div className="article-actions">
              <button type="button" className="btn" onClick={() => navigate(-1)}>
                Назад
              </button>
            </div>
          </header>
          {err && <p className="error">{err}</p>}
          {loading && !err && <p className="muted">Загрузка…</p>}
          {html && (
            <ArticleBody
              html={html}
              slugByTitle={catalog.slugByTitle}
              onNavigateSlug={goSlug}
            />
          )}
        </article>

        <aside className="article-graph" aria-label="Связанные статьи">
          <h2 className="graph-heading">Граф</h2>
          <p className="graph-hint">
            До семи узлов: текущая статья и исходящие/входящие ссылки внутри кластера.
          </p>
          <ReactFlowProvider>
            <NeighborGraph
              centerSlug={slug}
              centerTitle={title}
              neighbors={neighbors}
              onSelectSlug={goSlug}
            />
          </ReactFlowProvider>
        </aside>
      </div>
    </div>
  )
}

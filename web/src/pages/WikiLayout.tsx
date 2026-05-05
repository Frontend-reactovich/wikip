import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'

import { loadCatalog } from '../wiki/catalog'
import type { EdgeEntry } from '../wiki/types'

export type WikiOutletContext = {
  baseUrl: string
  slugByTitle: Map<string, string>
  titleBySlug: Map<string, string>
  edges: EdgeEntry[]
  articles: { slug: string; title: string; pageid: number }[]
}

export function WikiLayout() {
  const baseUrl = import.meta.env.BASE_URL
  const [ctx, setCtx] = useState<WikiOutletContext | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadCatalog(baseUrl)
      .then((c) =>
        setCtx({
          baseUrl,
          slugByTitle: c.slugByTitle,
          titleBySlug: c.titleBySlug,
          edges: c.edges,
          articles: c.articles,
        }),
      )
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : 'Ошибка загрузки данных'),
      )
  }, [baseUrl])

  if (error) {
    return (
      <div className="app-frame">
        <main className="shell">
          <p className="error">{error}</p>
        </main>
      </div>
    )
  }

  if (!ctx) {
    return (
      <div className="app-frame">
        <main className="shell">
          <p className="muted">Загрузка каталога…</p>
        </main>
      </div>
    )
  }

  return (
    <div className="app-frame">
      <main className="shell">
        <Outlet context={ctx} />
      </main>
      <footer className="site-footer">
        Тексты статей — материалы{' '}
        <a
          href="https://ru.wikipedia.org/"
          target="_blank"
          rel="noreferrer"
        >
          русской Википедии
        </a>
        ; лицензия{' '}
        <a
          href="https://creativecommons.org/licenses/by-sa/4.0/"
          target="_blank"
          rel="noreferrer"
        >
          CC BY-SA 4.0
        </a>
        .
      </footer>
    </div>
  )
}

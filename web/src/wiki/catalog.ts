import type { ArticlesPayload, EdgeEntry, EdgesPayload } from './types'
import { buildSlugIndexes } from './neighbors'

export async function loadCatalog(baseUrl: string): Promise<{
  articles: ArticlesPayload['articles']
  edges: EdgeEntry[]
  slugByTitle: Map<string, string>
  titleBySlug: Map<string, string>
}> {
  const root = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  const [ar, ed] = await Promise.all([
    fetch(`${root}data/articles.json`).then((r) => {
      if (!r.ok) throw new Error(`articles.json ${r.status}`)
      return r.json() as Promise<ArticlesPayload>
    }),
    fetch(`${root}data/edges.json`).then((r) => {
      if (!r.ok) throw new Error(`edges.json ${r.status}`)
      return r.json() as Promise<EdgesPayload>
    }),
  ])
  const { slugByTitle, titleBySlug } = buildSlugIndexes(ar.articles)
  return {
    articles: ar.articles,
    edges: ed.edges,
    slugByTitle,
    titleBySlug,
  }
}

export async function loadArticleHtml(
  baseUrl: string,
  slug: string,
): Promise<string> {
  const root = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  const res = await fetch(`${root}data/content/${slug}.html`)
  if (!res.ok) throw new Error(`content ${slug}: ${res.status}`)
  return res.text()
}

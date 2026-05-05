import type { EdgeEntry } from './types'

export function buildSlugIndexes(
  articles: { slug: string; title: string }[],
): {
  slugByTitle: Map<string, string>
  titleBySlug: Map<string, string>
} {
  const slugByTitle = new Map<string, string>()
  const titleBySlug = new Map<string, string>()
  for (const a of articles) {
    slugByTitle.set(a.title, a.slug)
    titleBySlug.set(a.slug, a.title)
  }
  return { slugByTitle, titleBySlug }
}

/**
 * Neighbor articles linked from the graph snapshot (outgoing + incoming), capped.
 */
export function neighborSlugs(
  slug: string,
  edges: EdgeEntry[],
  slugByTitle: Map<string, string>,
  titleBySlug: Map<string, string>,
  maxNeighbors = 6,
): string[] {
  const title = titleBySlug.get(slug)
  if (!title) return []

  const seen = new Set<string>()
  const ordered: string[] = []

  const push = (t: string | undefined) => {
    if (!t) return
    const s = slugByTitle.get(t)
    if (!s || s === slug || seen.has(s)) return
    seen.add(s)
    ordered.push(s)
  }

  for (const e of edges) {
    if (e.from === title) push(e.to)
    if (ordered.length >= maxNeighbors) break
  }
  for (const e of edges) {
    if (ordered.length >= maxNeighbors) break
    if (e.to === title) push(e.from)
  }

  ordered.sort((a, b) =>
    (titleBySlug.get(a) ?? '').localeCompare(titleBySlug.get(b) ?? '', 'ru'),
  )
  return ordered.slice(0, maxNeighbors)
}

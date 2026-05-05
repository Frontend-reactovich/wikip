/** Decode Parsoid/Wikipedia relative links → canonical article title (spaces). */
export function titleFromWikiHref(href: string): string | null {
  const h = href.trim()
  if (h.startsWith('./')) {
    const raw = h.slice(2).split(/[#?]/)[0]
    if (
      raw.startsWith('Файл:') ||
      raw.startsWith('Шаблон:') ||
      raw.startsWith('Категория:')
    )
      return null
    try {
      return decodeURIComponent(raw).replace(/_/g, ' ')
    } catch {
      return raw.replace(/_/g, ' ')
    }
  }
  if (h.startsWith('/wiki/')) {
    const raw = h.slice('/wiki/'.length).split(/[#?]/)[0]
    try {
      return decodeURIComponent(raw).replace(/_/g, ' ')
    } catch {
      return raw.replace(/_/g, ' ')
    }
  }
  return null
}

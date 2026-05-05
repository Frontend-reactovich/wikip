export type ArticleEntry = {
  slug: string
  title: string
  pageid: number
}

export type EdgeEntry = {
  from: string
  to: string
}

export type ArticlesPayload = {
  articles: ArticleEntry[]
  generatedAt?: string
}

export type EdgesPayload = {
  edges: EdgeEntry[]
  generatedAt?: string
}

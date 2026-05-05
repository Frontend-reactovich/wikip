import { Link } from 'react-router-dom'

import type { ArticleEntry } from '../wiki/types'

type Props = {
  articles: ArticleEntry[]
}

export function Home({ articles }: Props) {
  const sorted = [...articles].sort((a, b) =>
    a.title.localeCompare(b.title, 'ru'),
  )
  return (
    <div className="home">
      <header className="page-head">
        <h1>WikiGraph Lite</h1>
        <p className="lede">
          Небольшой тематический кластер статей с русской Википедии и связи между
          ними. Выберите статью для чтения и обхода по графу.
        </p>
      </header>
      <ul className="article-list">
        {sorted.map((a) => (
          <li key={a.slug}>
            <Link to={`/wiki/${a.slug}`}>{a.title}</Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

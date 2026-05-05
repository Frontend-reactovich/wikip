import { Navigate, Route, Routes, useOutletContext } from 'react-router-dom'

import type { WikiOutletContext } from './pages/WikiLayout'
import { WikiLayout } from './pages/WikiLayout'
import { Home } from './pages/Home'
import { ArticlePage } from './pages/ArticlePage'

function HomeRoute() {
  const ctx = useOutletContext<WikiOutletContext>()
  return <Home articles={ctx.articles} />
}

function ArticleRoute() {
  const ctx = useOutletContext<WikiOutletContext>()
  return <ArticlePage baseUrl={ctx.baseUrl} catalog={ctx} />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<WikiLayout />}>
        <Route index element={<HomeRoute />} />
        <Route path="wiki/:slug" element={<ArticleRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

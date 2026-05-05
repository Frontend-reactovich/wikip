# TODOS — WikiGraph Lite

## 1. Bootstrap repo (tooling + CI)
- **What:** Vite + React + TS, ESLint, Vitest, Playwright, GitHub Actions (lint, test, build, deploy).
- **Status:** Частично сделано — приложение в каталоге `web/` (Vite react-ts), CI: `.github/workflows/ci.yml` (lint + build). Осталось: Vitest, Playwright, deploy (Pages/Vercel).
- **Why:** Без этого каждый следующий шаг дороже; NFR и дизайн-док предполагают измеримый MVP.
- **Pros:** Быстрый feedback, `/qa` может опереться на стабильный pipeline.
- **Cons:** ~2–4 часа на настройку.
- **Context:** Доки в корне репо; исходники UI — в `web/`.
- **Depends on:** —  
- **Blocked by:** —

## 2. Data snapshot format + ingest script
- **What:** `data/manifest.json`, `data/edges.json`, `content/{slug}.html` (или md); `scripts/ingest-wikipedia.mjs` для 20 ru-статей кластера.
- **Why:** Дизайн-док требует curated source of truth и детерминизм маршрутов.
- **Pros:** Воспроизводимая сборка; без живых API в runtime.
- **Cons:** Нужно один раз аккуратно выбрать кластер и slug-и.
- **Context:** См. The Assignment в `DESIGN-wikigraph-lite.md`.
- **Depends on:** #1 (желательно, можно параллельно локально).  
- **Blocked by:** —

## 3. Reader + graph + history (MVP UI)
- **What:** Одна основная вьюха: статья, граф ≤7 узлов, breadcrumbs/back, загрузка данных из `/data`.
- **Why:** Core value из дизайн-дока.
- **Pros:** Демо для пользовательских тестов.
- **Cons:** Нужны решения по библиотеке графа (см. `ENG-PLAN-wikigraph-mvp.md`).
- **Context:** После #2 есть реальные данные для разработки.
- **Depends on:** #2.  
- **Blocked by:** —

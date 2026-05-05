# Engineering plan: WikiGraph Lite MVP

Source design: `DESIGN-wikigraph-lite.md`  
Review: `/plan-eng-review` (2026-05-06)  
Mode: greenfield (кода в репозитории пока нет)

## Step 0 — Scope challenge

### What already exists
- Нет приложения, CI, тестов. Есть только продуктовый дизайн-док.
- Переиспользуем **открытый контент** (Wikipedia) как сырьё для снапшота, не строим собственную энциклопедию.

### Minimum set of changes (MVP)
1. Статический **снапшот данных**: 20 статей (ru) + curated рёбра `related` + опциональные suggested (пустой массив до V1).
2. Одна страница приложения: **ридер** + **панель графа** (max 7 узлов видимых) + **breadcrumbs / history / back**.
3. Скрипт сборки данных (one-shot): вытянуть HTML/текст и метаданные, положить в `data/`.
4. Деплой: static hosting + CI (build + lint + test).

### Complexity check
- MVP укладывается в **< 8 файлов** логики, если не тянуть тяжёлый graph-бандл; при росте — отслеживать.

### Search / boring tech ([Layer 1])
- UI: **React 18 + Vite + TypeScript** (стандарт, быстрый dev, static deploy).
- Граф: **@xyflow/react** (React Flow) или **Cytoscape.js** — выбрать один; для MVP достаточно React Flow + ограничение узлов.
- Данные MVP: **JSON + markdown/html фрагменты в репозитории**, без SQLite в runtime на edge static (см. Architecture §1).

### Distribution
- **GitHub Actions**: `lint`, `test`, `build`, deploy на выбранный хостинг.
- Артефакт: статический сайт; пользователь открывает URL.

---

## 1. Architecture

### 1.1 Решение: static bundle вместо SQLite в браузере (коррекция к дизайн-доку)

**Проблема:** «SQLite + precomputed adjacency» в дизайн-доке хорошо для локального tooling, но для **чистого static deploy** (Vercel/Netlify/Pages без сервера) рантайм-SQLite усложняет билд и хостинг.

**Рекомендация MVP:**  
- Рантайм: `articles.json` (index по `slug`) + `edges.json` (список `{ from, to, kind }`) + файлы контента `content/{slug}.html` (или `.md` + рендер).  
- SQLite опционально **только** в dev-скрипте ingest (если удобно), с экспортом в JSON перед коммитом.

**Confidence:** 8/10 — паттерн «static site + data snapshot» самый дешёвый для MVP.

### 1.2 Компоненты

```
[Browser]
   │
   ▼
[Vite SPA]
   ├── Router (slug в URL /wiki/:slug или /s/:slug)
   ├── ArticlePane (sanitized HTML / rendered MD)
   ├── GraphPane (subset ≤7 nodes + "ещё")
   ├── RouteChrome (breadcrumbs, back, history stack)
   └── dataLoader (fetch JSON из /data/*)
```

### 1.3 Поток данных (happy path)

```
User opens /wiki/foo
        │
        ▼
dataLoader.getArticle("foo") ──► render ArticlePane
        │
        ▼
dataLoader.getNeighbors("foo") ──► pick top N curated edges ──► GraphPane
        │
        user clicks node "bar"
        │
        ▼
push history state ─► navigate /wiki/bar ─► repeat
```

### 1.4 URL и детерминизм маршрута

- Каждая статья — уникальный `slug`.  
- **Route determinism** из дизайн-дока: при фиксированном снапшоте порядок топ-соседей задаётся явным полем `rank` или сортировкой по `slug` при равенстве.

### 1.5 Безопасность

- Контент только из **доверенного снапшота** в репозитории; рендер через **DOMPurify** (или эквивалент) если HTML.  
- Нет пользовательского ввода в MVP.  
- CSP заголовки на стороне хостинга по возможности.

### 1.6 Отказоустойчивость

- Нет статьи / битый slug → страница 404 + кнопка «назад по истории».  
- Нет рёбер → граф показывает пустое состояние, ридер жив.

---

## 2. Code quality (план структуры репозитория)

```
src/
  app/ or pages/          # маршрутизация
  components/             # ArticlePane, GraphPane, Layout
  lib/
    data/                 # типы, загрузка JSON, выбор соседей
    graph/                # layout helpers, cap 7 nodes
    routing/              # history stack sync с URL
data/                     # артефакты снапшота (коммитим)
scripts/
  ingest-wikipedia.mjs    # одноразовая/редкая пересборка снапшота
```

**DRY:** один модуль `selectNeighbors(slug, edges, cap)` — используется и в графе, и в тестах.

---

## 3. Tests — coverage map

```
CODE PATHS                                              USER FLOWS
[+] lib/data/loadManifest                               [+] Открыть статью по URL
  ├── parse manifest OK                                 ├── [★★★] slug exists → контент
  ├── missing slug                                      ├── [★★★] unknown slug → 404 UX
  └── corrupt JSON                                      └── [★★★] broken manifest → error boundary

[+] lib/graph/selectNeighbors
  ├── cap 7 nodes
  ├── curated-only edges
  └── deterministic sort

[+] lib/routing/history
  ├── push on navigate
  ├── back pops and updates URL
  └── deep link then back

COVERAGE target: все ветки выше ≥ ★★★ для MVP
```

### E2E
- **[→E2E]** Один сценарий Playwright: `foo → click neighbor → bar → back → foo` + проверка breadcrumbs.

---

## 4. Performance

- Ленивая загрузка: грузить полный текст статьи по `slug` (динамический `import()` или `fetch` одного файла).  
- Граф: не больше 7 узлов + виртуализация если позже.  
- Бюджет: соответствовать NFR из дизайн-дока (p95, отрисовка графа).

---

## NOT in scope (явно отложено)

| Item | Rationale |
|------|-----------|
| Wiki-редактор, учётки, модерация | по дизайн-доку Non-Goals |
| Мультиязычность | MVP ru-only |
| AI-слой | V2+ |
| Живой Wikidata ingest в проде | V1; MVP только снапшот |
| Персонализация, аккаунты | post-MVP |
| Серверный поиск по всей Википедии | не нужен для 20 статей |

---

## What already exists

- Только `DESIGN-wikigraph-lite.md`. Код и инфраструктура отсутствуют — всё предстоит создать.

---

## Failure modes (production-minded)

| Failure | Test? | Handling | User-visible |
|---------|-------|----------|--------------|
| Bad slug | unit+E2E | 404 view | да |
| Corrupt data snapshot | unit | error boundary + сообщение | да |
| History / URL рассинхрон | E2E | один источник правды (URL или stack) | да |
| Graph layout slow | perf smoke | cap узлов | деградация |

**Critical gap:** нет тестов на «corrupt JSON» до появления CI — закрыть в первом PR.

---

## Worktree / parallelization

**Sequential implementation, no parallelization opportunity** — один модуль данных и один UI-поток до появления второго независимого workstream.

---

## Implementation order (suggested)

1. Инициализировать Vite+React+TS, ESLint, Vitest, Playwright.  
2. Зафиксировать формат `data/manifest.json` + `data/edges.json`.  
3. Заполнить снапшот 20 статей (скрипт ingest).  
4. Реализовать страницу чтения + граф + history.  
5. Тесты + E2E + CI + deploy.

---

## Open engineering decisions (из продуктового дизайн-дока)

1. Логин в MVP — по умолчанию **нет** (анонимный ридер).  
2. Экспорт маршрута — **V1**, не MVP.

---

## Completion summary (plan-eng-review)

- Step 0: Scope Challenge — **scope accepted as-is** (MVP уже минимален; уточнён static JSON vs SQLite runtime).  
- Architecture Review: **1** решение зафиксировано в плане (static snapshot).  
- Code Quality Review: **0** issues (кода нет; структура задана).  
- Test Review: diagram above, **gaps** закрываются первым PR.  
- Performance Review: **0** отдельных issues (NFR из дизайн-дока).  
- NOT in scope: **written**  
- What already exists: **written**  
- Failure modes: **0** critical gaps после мержа тестов (до мержа — см. выше).  
- Outside voice: **skipped** (можно запустить отдельно).  
- Parallelization: sequential  

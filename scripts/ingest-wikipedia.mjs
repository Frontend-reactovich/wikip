/**
 * Fetches a curated cluster from ru.wikipedia.org (HTML + internal edges).
 * Output: web/public/data/articles.json, edges.json, content/p{pageid}.html
 *
 * Usage: node scripts/ingest-wikipedia.mjs
 * Requires: Node 18+ (fetch). Network access.
 */

import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "web", "public", "data");
const CONTENT_DIR = join(OUT_DIR, "content");

const WIKI_ORIGIN = "https://ru.wikipedia.org";
const API = `${WIKI_ORIGIN}/w/api.php`;
const REST_HTML = (titleEnc) =>
  `${WIKI_ORIGIN}/api/rest_v1/page/html/${titleEnc}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchWithRetry(url, options = {}, attempts = 6) {
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(url, options);
    if (res.status === 429 || res.status === 503) {
      const wait = Math.min(45000, 2500 * 2 ** i + Math.random() * 800);
      console.warn(`Retry ${res.status} after ${Math.round(wait)}ms`);
      await sleep(wait);
      continue;
    }
    return res;
  }
  throw new Error(`fetch failed after retries: ${url}`);
}

/** Resolve many titles in one query (redirects applied). */
async function resolvePagesBatch(titles) {
  const u = new URL(API);
  u.searchParams.set("action", "query");
  u.searchParams.set("format", "json");
  u.searchParams.set("redirects", "1");
  u.searchParams.set("titles", titles.join("|"));
  const res = await fetchWithRetry(u);
  if (!res.ok) throw new Error(`API ${res.status}: ${u}`);
  const data = await res.json();
  const pages = data.query?.pages;
  if (!pages) return [];
  const out = [];
  for (const p of Object.values(pages)) {
    if (p.missing != null || p.invalid != null) continue;
    out.push({ pageid: p.pageid, title: p.title });
  }
  return out;
}

function encodeTitleForPath(title) {
  return encodeURIComponent(title.replace(/ /g, "_"));
}

/** Extract mw-parser-output inner HTML from full doc */
function extractParserOutput(html) {
  const m = html.match(
    /<section[^>]*class="[^"]*mw-parser-output[^"]*"[^>]*>([\s\S]*?)<\/section>/i
  );
  if (m) return m[1];
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return body ? body[1] : html;
}

/** Decode minimal entities in MediaWiki title attributes */
function decodeMwTitle(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}

/** Title from Parsoid relative href ./Article_Name */
function titleFromParsoidHref(hrefPath) {
  if (!hrefPath.startsWith("./")) return null;
  const raw = hrefPath.slice(2).split(/[#?]/)[0];
  if (
    raw.startsWith("Файл:") ||
    raw.startsWith("Шаблон:") ||
    raw.startsWith("Категория:")
  )
    return null;
  try {
    return decodeURIComponent(raw).replace(/_/g, " ");
  } catch {
    return raw.replace(/_/g, " ");
  }
}

/** Legacy parser HTML uses /wiki/... */
function titleFromWikiHref(hrefPath) {
  if (!hrefPath.startsWith("/wiki/")) return null;
  const raw = hrefPath.slice("/wiki/".length).split(/[#?]/)[0];
  try {
    return decodeURIComponent(raw).replace(/_/g, " ");
  } catch {
    return raw.replace(/_/g, " ");
  }
}

/** Collect wiki links (Parsoid + legacy) to titles in allowed set */
function extractEdges(htmlFragment, sourceTitle, titleSet) {
  const edges = [];
  const seen = new Set();

  const pushEdge = (target) => {
    if (!target || target === sourceTitle) return;
    if (!titleSet.has(target)) return;
    const key = `${sourceTitle}→${target}`;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push({ from: sourceTitle, to: target });
  };

  const tagRe = /<a\b[^>]*rel="mw:WikiLink"[^>]*>/gi;
  let m;
  while ((m = tagRe.exec(htmlFragment))) {
    const tag = m[0];
    const tm = tag.match(/\btitle="([^"]*)"/);
    const hm = tag.match(/\bhref="([^"]*)"/);
    if (tm) pushEdge(decodeMwTitle(tm[1]));
    else if (hm) {
      const h = hm[1];
      pushEdge(titleFromParsoidHref(h) ?? titleFromWikiHref(h));
    }
  }

  const legacyRe = /href="(\/wiki\/[^"#]+)"/g;
  while ((m = legacyRe.exec(htmlFragment))) {
    pushEdge(titleFromWikiHref(m[1]));
  }

  return edges;
}

async function main() {
  const seedPath = join(__dirname, "seed-titles.json");
  const raw = JSON.parse(await readFile(seedPath, "utf8"));
  await sleep(800);
  const resolved = await resolvePagesBatch(raw);
  const resolvedNorm = new Set(
    resolved.map((p) => p.title.replace(/ /g, "_").toLowerCase())
  );
  for (const t of raw) {
    const n = t.replace(/ /g, "_").toLowerCase();
    if (!resolvedNorm.has(n))
      console.warn(`Seed title not found or merged: ${t}`);
  }

  const uniqueByPage = new Map();
  for (const p of resolved) {
    if (!uniqueByPage.has(p.pageid)) uniqueByPage.set(p.pageid, p);
  }
  const articles = [...uniqueByPage.values()];
  const titleSet = new Set(articles.map((a) => a.title));

  await mkdir(CONTENT_DIR, { recursive: true });

  const manifest = [];
  let allEdges = [];

  for (const { pageid, title } of articles) {
    const enc = encodeTitleForPath(title);
    const url = REST_HTML(enc);
    const res = await fetchWithRetry(url, {
      headers: {
        "User-Agent": "WikiGraphLite/0.1 (https://github.com/Frontend-reactovich/wikip; educational)",
        Accept: "text/html",
      },
    });
    await sleep(600);
    if (!res.ok) {
      console.warn(`Skip HTML ${res.status}: ${title}`);
      continue;
    }
    const fullHtml = await res.text();
    const fragment = extractParserOutput(fullHtml);
    const slug = `p${pageid}`;
    await writeFile(join(CONTENT_DIR, `${slug}.html`), fragment, "utf8");
    manifest.push({ slug, title, pageid });
    allEdges = allEdges.concat(extractEdges(fragment, title, titleSet));
  }

  const edgeKey = (e) => `${e.from}→${e.to}`;
  const dedup = new Map();
  for (const e of allEdges) {
    if (!dedup.has(edgeKey(e))) dedup.set(edgeKey(e), e);
  }
  const edges = [...dedup.values()];

  await writeFile(
    join(OUT_DIR, "articles.json"),
    JSON.stringify({ articles: manifest, generatedAt: new Date().toISOString() }, null, 2),
    "utf8"
  );
  await writeFile(
    join(OUT_DIR, "edges.json"),
    JSON.stringify({ edges, generatedAt: new Date().toISOString() }, null, 2),
    "utf8"
  );

  console.log(
    `OK: ${manifest.length} articles, ${edges.length} edges → ${OUT_DIR}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

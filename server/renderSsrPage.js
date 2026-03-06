const FALLBACK_API = 'https://basic-api-wiki-hvdo.vercel.app/api/characters'

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function escapeAttr(value = '') {
  return escapeHtml(value).replaceAll('`', '&#96;')
}

function characterCard(character) {
  const name = escapeHtml(character.name ?? 'Unknown')
  const type = escapeHtml(character.type ?? 'Unknown')
  const description = escapeHtml(character.description ?? 'No description available.')
  const image = escapeAttr(character.image ?? '')
  return `
    <article class="ssr-card">
      ${image ? `<img class="ssr-card__image" src="${image}" alt="${name}" loading="lazy" />` : ''}
      <div class="ssr-card__body">
        <p class="ssr-card__type">${type}</p>
        <h3 class="ssr-card__name">${name}</h3>
        <p class="ssr-card__desc">${description}</p>
      </div>
    </article>
  `
}

function renderCards(characters) {
  if (!Array.isArray(characters) || characters.length === 0) {
    return '<p class="ssr-empty">No entries available in SSR response.</p>'
  }
  return characters.map((character) => characterCard(character)).join('\n')
}

export async function getCharacters(apiUrl = FALLBACK_API) {
  const response = await fetch(apiUrl, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`API error ${response.status}`)
  const data = await response.json()
  if (!Array.isArray(data)) throw new Error('Invalid payload')
  return data
}

export function buildSsrHtml({ characters, errorMessage }) {
  const cards = renderCards(characters)
  const statusBlock = errorMessage
    ? `<p class="ssr-status ssr-status--error">${escapeHtml(errorMessage)}</p>`
    : '<p class="ssr-status">Rendered on the server before sending HTML to the browser.</p>'

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Enter The Dungeon · SSR Prototype</title>
    <style>
      :root { color-scheme: dark; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: 'Space Grotesk', 'Segoe UI', sans-serif;
        background: #0c0d14;
        color: #e8e8f0;
      }
      .ssr-page {
        max-width: 1200px;
        margin: 0 auto;
        padding: 2rem 1.25rem 2.75rem;
      }
      .ssr-header {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1.25rem;
      }
      .ssr-title {
        margin: 0;
        font-size: clamp(1.6rem, 4.6vw, 2.6rem);
        color: #c9963e;
      }
      .ssr-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        font-size: 0.78rem;
        border-radius: 999px;
        padding: 0.35rem 0.75rem;
        color: #6ee7b7;
        background: rgba(16,185,129,0.12);
        border: 1px solid rgba(16,185,129,0.35);
      }
      .ssr-back {
        color: #d0d3e8;
        text-decoration: none;
        border: 1px solid rgba(255,255,255,0.15);
        border-radius: 999px;
        padding: 0.35rem 0.75rem;
      }
      .ssr-status {
        margin: 0 0 1rem;
        color: #9fa3bf;
        font-size: 0.92rem;
      }
      .ssr-status--error {
        color: #ff9f9f;
      }
      .ssr-grid {
        display: grid;
        gap: 1rem;
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      }
      .ssr-card {
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 14px;
        overflow: hidden;
        background: #13141f;
      }
      .ssr-card__image {
        display: block;
        width: 100%;
        height: 190px;
        object-fit: cover;
      }
      .ssr-card__body { padding: 0.85rem 0.95rem 1rem; }
      .ssr-card__type { margin: 0; color: #8a8da8; font-size: 0.8rem; }
      .ssr-card__name { margin: 0.25rem 0 0.45rem; font-size: 1.03rem; }
      .ssr-card__desc { margin: 0; color: #c3c5d7; font-size: 0.88rem; }
      .ssr-empty { color: #9fa3bf; }
    </style>
  </head>
  <body>
    <main class="ssr-page">
      <header class="ssr-header">
        <h1 class="ssr-title">Enter the Dungeon · SSR</h1>
        <span class="ssr-badge">Server-side rendered</span>
        <a class="ssr-back" href="/">Open CSR app</a>
      </header>
      ${statusBlock}
      <section class="ssr-grid">
        ${cards}
      </section>
    </main>
  </body>
</html>`
}

export async function createSsrHtmlResponse(apiUrl = FALLBACK_API) {
  try {
    const characters = await getCharacters(apiUrl)
    return buildSsrHtml({ characters, errorMessage: '' })
  } catch (error) {
    return buildSsrHtml({
      characters: [],
      errorMessage: `Unable to load API data on server: ${error.message}`,
    })
  }
}

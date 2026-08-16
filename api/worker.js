/**
 * COREPLUS CORE NEWS API
 * Cloudflare Worker + KV storage.
 *
 * Endpoints:
 *   GET    /api/news          — public, returns { items: [...] }
 *   POST   /api/news          — auth required, creates one news item
 *   PUT    /api/news/:id      — auth required, updates one news item
 *   DELETE /api/news/:id      — auth required, deletes one news item
 *
 * Auth: send header  Authorization: Bearer <API_TOKEN>
 * The token is set as a Worker secret (see README.md in this folder).
 *
 * Storage: Cloudflare KV namespace bound as NEWS_KV, key "news"
 * holding a JSON array of news items.
 */

const ALLOWED_ORIGINS = [
  'https://coreplus-tech.ru',
  'https://www.coreplus-tech.ru',
  'http://127.0.0.1:5500',   // Live Server (local dev)
  'http://localhost:5500',
];

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

function json(data, status = 200, origin = '*') {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

function isAuthorized(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace('Bearer ', '').trim();
  return token && token === env.API_TOKEN;
}

async function getNews(env) {
  const raw = await env.NEWS_KV.get('news');
  return raw ? JSON.parse(raw) : [];
}

async function saveNews(env, items) {
  await env.NEWS_KV.put('news', JSON.stringify(items));
}

function validateItem(body) {
  const errors = [];
  if (!body.title || typeof body.title !== 'string') errors.push('title is required (string)');
  if (!body.excerpt || typeof body.excerpt !== 'string') errors.push('excerpt is required (string)');
  const validSources = ['coreplus', 'telegram', 'dzen', 'vc', 'habr', 'rbc'];
  if (!body.source || !validSources.includes(body.source)) {
    errors.push(`source is required, one of: ${validSources.join(', ')}`);
  }
  return errors;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '*';
    const pathParts = url.pathname.split('/').filter(Boolean); // ['api','news', maybe id]

    // Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    if (pathParts[0] !== 'api' || pathParts[1] !== 'news') {
      return json({ error: 'Not found' }, 404, origin);
    }

    const itemId = pathParts[2]; // present for PUT/DELETE on /api/news/:id

    // ── GET /api/news — public ──
    if (request.method === 'GET') {
      const items = await getNews(env);
      return json({ items }, 200, origin);
    }

    // Everything below requires auth
    if (!isAuthorized(request, env)) {
      return json({ error: 'Unauthorized. Provide header: Authorization: Bearer <token>' }, 401, origin);
    }

    // ── POST /api/news — create ──
    if (request.method === 'POST' && !itemId) {
      let body;
      try { body = await request.json(); } catch { return json({ error: 'Invalid JSON body' }, 400, origin); }

      const errors = validateItem(body);
      if (errors.length) return json({ error: 'Validation failed', details: errors }, 400, origin);

      const items = await getNews(env);
      const newItem = {
        id: body.id || crypto.randomUUID(),
        title: body.title,
        excerpt: body.excerpt,
        source: body.source,
        url: body.url || '#',
        date: body.date || new Date().toISOString().slice(0, 10),
        featured: !!body.featured,
      };
      items.unshift(newItem);
      await saveNews(env, items);
      return json({ ok: true, item: newItem }, 201, origin);
    }

    // ── PUT /api/news/:id — update ──
    if (request.method === 'PUT' && itemId) {
      let body;
      try { body = await request.json(); } catch { return json({ error: 'Invalid JSON body' }, 400, origin); }

      const items = await getNews(env);
      const idx = items.findIndex(i => i.id === itemId);
      if (idx === -1) return json({ error: 'News item not found' }, 404, origin);

      items[idx] = { ...items[idx], ...body, id: itemId };
      await saveNews(env, items);
      return json({ ok: true, item: items[idx] }, 200, origin);
    }

    // ── DELETE /api/news/:id ──
    if (request.method === 'DELETE' && itemId) {
      const items = await getNews(env);
      const filtered = items.filter(i => i.id !== itemId);
      if (filtered.length === items.length) return json({ error: 'News item not found' }, 404, origin);

      await saveNews(env, filtered);
      return json({ ok: true }, 200, origin);
    }

    return json({ error: 'Method not allowed' }, 405, origin);
  },
};

/**
 * API Router — Handles all API endpoints
 *
 * Auto-wired from the provider registry:
 * - GET /api/state       → all provider data (unified)
 * - GET /api/providers   → list registered providers
 * - GET /api/providers/:id → single provider data
 * - GET /api/categories  → category config for frontend
 * - GET /api/health      → health check
 * - GET /api/events      → SSE stream
 */

async function handleAPI(req, res, pathname, registry, sse) {
  // Health check
  if (pathname === '/api/health') {
    json(res, { status: 'ok', timestamp: new Date().toISOString() });
    return true;
  }

  // SSE events stream
  if (pathname === '/api/events') {
    sse.connect(req, res);
    return true;
  }

  // Unified state (all providers)
  if (pathname === '/api/state') {
    const state = await registry.getAllData();
    state.categories_config = registry.getCategoryConfig();
    json(res, state);
    return true;
  }

  // List providers
  if (pathname === '/api/providers') {
    json(res, { providers: registry.listProviders() });
    return true;
  }

  // Category config
  if (pathname === '/api/categories') {
    json(res, registry.getCategoryConfig());
    return true;
  }

  // Single provider data
  const providerMatch = pathname.match(/^\/api\/providers\/([a-z0-9-]+)$/);
  if (providerMatch) {
    const id = providerMatch[1];
    const data = await registry.getData(id);
    if (!data) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Provider '${id}' not found` }));
      return true;
    }
    json(res, data);
    return true;
  }

  return false; // Not an API route
}

function json(res, data) {
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(data, null, 2));
}

module.exports = { handleAPI };

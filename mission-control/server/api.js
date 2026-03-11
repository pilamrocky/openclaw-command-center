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
 * - GET /api/files       → workspace file browser
 */

const fs = require('fs');
const path = require('path');

async function handleAPI(req, res, pathname, registry, sse, config) {
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

  // ===== File Browser =====
  if (pathname === '/api/files') {
    return handleFiles(req, res, config);
  }

  return false; // Not an API route
}

/**
 * File browser API
 * GET /api/files            → workspace root listing
 * GET /api/files?path=docs  → subdirectory listing
 * GET /api/files?path=TODO.md&content=true → file content
 */
function handleFiles(req, res, config) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const reqPath = url.searchParams.get('path') || '';
  const wantContent = url.searchParams.get('content') === 'true';

  const workspaceRoot = path.resolve(config.paths.workspace);

  // Resolve and validate path (prevent traversal)
  const resolved = path.resolve(workspaceRoot, reqPath);
  if (!resolved.startsWith(workspaceRoot)) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Access denied' }));
    return true;
  }

  if (!fs.existsSync(resolved)) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return true;
  }

  const stat = fs.statSync(resolved);

  // Directory listing
  if (stat.isDirectory()) {
    try {
      const entries = fs.readdirSync(resolved, { withFileTypes: true })
        .filter((e) => !e.name.startsWith('.'))
        .map((e) => {
          const entryPath = path.join(resolved, e.name);
          const entryStat = fs.statSync(entryPath);
          const relativePath = path.relative(workspaceRoot, entryPath);
          return {
            name: e.name,
            path: relativePath,
            type: e.isDirectory() ? 'directory' : 'file',
            size: e.isFile() ? entryStat.size : undefined,
            sizeFormatted: e.isFile() ? formatBytes(entryStat.size) : undefined,
            modified: entryStat.mtime.toISOString(),
            extension: e.isFile() ? path.extname(e.name).toLowerCase() : undefined,
          };
        })
        .sort((a, b) => {
          if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
          return a.name.localeCompare(b.name);
        });

      json(res, {
        path: reqPath || '/',
        type: 'directory',
        entries,
      });
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to read directory' }));
    }
    return true;
  }

  // File content
  if (stat.isFile()) {
    const ext = path.extname(resolved).toLowerCase();
    const allowedExtensions = ['.md', '.json', '.txt', '.yml', '.yaml', '.toml', '.csv', '.log', '.sh', '.js', '.html', '.css'];

    if (!allowedExtensions.includes(ext)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `File type '${ext}' not supported` }));
      return true;
    }

    if (stat.size > 512 * 1024) {
      json(res, {
        path: reqPath,
        type: 'file',
        name: path.basename(resolved),
        extension: ext,
        size: stat.size,
        sizeFormatted: formatBytes(stat.size),
        modified: stat.mtime.toISOString(),
        content: null,
        error: 'File too large to display (max 512KB)',
      });
      return true;
    }

    const content = fs.readFileSync(resolved, 'utf8');
    json(res, {
      path: reqPath,
      type: 'file',
      name: path.basename(resolved),
      extension: ext,
      size: stat.size,
      sizeFormatted: formatBytes(stat.size),
      modified: stat.mtime.toISOString(),
      content,
    });
    return true;
  }

  res.writeHead(400, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Unsupported entry type' }));
  return true;
}

function formatBytes(bytes) {
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + ' GB';
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return bytes + ' B';
}

function json(res, data) {
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(data, null, 2));
}

module.exports = { handleAPI };

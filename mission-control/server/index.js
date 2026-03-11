/**
 * Mission Control — Main Server
 *
 * Zero-dependency HTTP server that:
 * 1. Auto-discovers data providers
 * 2. Serves REST API + SSE stream
 * 3. Serves static frontend files
 * 4. Broadcasts state updates in real-time
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const { CONFIG } = require('./config');
const { ProviderRegistry } = require('./providers/registry');
const { SSEManager } = require('./sse');
const { handleAPI } = require('./api');

// ============================================================================
// INITIALIZE
// ============================================================================
const registry = new ProviderRegistry(CONFIG);
const sse = new SSEManager();
const STATIC_DIR = path.join(__dirname, '..', 'public');

// Auto-discover providers
registry.discover();

// ============================================================================
// STATIC FILE SERVER
// ============================================================================
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname === '/' ? '/index.html' : url.pathname;

  // Block path traversal
  if (pathname.includes('..')) {
    res.writeHead(400);
    res.end('Bad request');
    return;
  }

  const filePath = path.join(STATIC_DIR, pathname);
  const resolved = path.resolve(filePath);
  const resolvedStatic = path.resolve(STATIC_DIR);

  if (!resolved.startsWith(resolvedStatic)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath);
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'text/plain',
      'Cache-Control': 'no-store',
    });
    res.end(content);
  });
}

// ============================================================================
// HTTP SERVER
// ============================================================================
const server = http.createServer(async (req, res) => {
  const pathname = req.url.split('?')[0];

  // API routes
  if (pathname.startsWith('/api/')) {
    const handled = await handleAPI(req, res, pathname, registry, sse);
    if (handled) return;
  }

  // Static files
  serveStatic(req, res);
});

// ============================================================================
// START
// ============================================================================
const { port, host } = CONFIG.server;

server.listen(port, host, () => {
  console.log('');
  console.log('🚀 Mission Control online');
  console.log(`   http://${host}:${port}`);
  console.log(`   Providers: ${registry.listProviders().map((p) => p.id).join(', ')}`);
  console.log('');

  // Initial data load
  setTimeout(async () => {
    const state = await registry.getAllData();
    console.log(`[Startup] All providers loaded (${Object.keys(state.providers).length} active)`);
  }, 200);
});

// Broadcast state updates to SSE clients
setInterval(async () => {
  if (sse.count > 0) {
    try {
      const state = await registry.getAllData();
      state.categories_config = registry.getCategoryConfig();
      sse.broadcast('update', state);
    } catch (e) {
      console.error('[SSE] Broadcast error:', e.message);
    }
  }
}, 15000);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Shutdown] Stopping Mission Control...');
  registry.shutdown();
  server.close();
  process.exit(0);
});

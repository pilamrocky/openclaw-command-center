/**
 * SSE Manager — Server-Sent Events connection manager
 *
 * Manages client connections and broadcasts state updates.
 */

class SSEManager {
  constructor() {
    this.clients = new Set();
  }

  /**
   * Handle a new SSE connection
   */
  connect(req, res) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    this.clients.add(res);
    console.log(`[SSE] Client connected (total: ${this.clients.size})`);

    // Send welcome
    this.send(res, 'connected', {
      message: 'Connected to Mission Control',
      timestamp: Date.now(),
    });

    // Clean up on disconnect
    req.on('close', () => {
      this.clients.delete(res);
      console.log(`[SSE] Client disconnected (total: ${this.clients.size})`);
    });
  }

  /**
   * Send an event to a single client
   */
  send(res, event, data) {
    try {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch (e) {
      // Client disconnected
      this.clients.delete(res);
    }
  }

  /**
   * Broadcast an event to all connected clients
   */
  broadcast(event, data) {
    for (const client of this.clients) {
      this.send(client, event, data);
    }
  }

  /**
   * Get current connection count
   */
  get count() {
    return this.clients.size;
  }
}

module.exports = { SSEManager };

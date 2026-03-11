/**
 * Mission Control — Main App
 *
 * Connects to the SSE stream, manages state, and drives the card engine.
 */

(function () {
  'use strict';

  let eventSource = null;
  let reconnectTimer = null;
  let lastUpdate = 0;

  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  const dashboard = document.getElementById('dashboard');

  // Initialize card engine
  CardEngine.init(dashboard);

  // Start
  connect();

  /**
   * Initial data fetch then connect SSE
   */
  async function connect() {
    setStatus('connecting');

    // Initial load via REST
    try {
      const res = await fetch('/api/state');
      const state = await res.json();
      CardEngine.render(state);
      lastUpdate = Date.now();
      setStatus('connected');
    } catch (e) {
      console.error('[App] Initial fetch failed:', e);
      setStatus('disconnected');
    }

    // Connect SSE for live updates
    connectSSE();
  }

  /**
   * Connect to SSE stream
   */
  function connectSSE() {
    if (eventSource) {
      eventSource.close();
    }

    eventSource = new EventSource('/api/events');

    eventSource.addEventListener('connected', (e) => {
      console.log('[SSE] Connected');
      setStatus('connected');
      clearReconnect();
    });

    eventSource.addEventListener('update', (e) => {
      try {
        const state = JSON.parse(e.data);
        CardEngine.render(state);
        lastUpdate = Date.now();
        setStatus('connected');
      } catch (err) {
        console.error('[SSE] Parse error:', err);
      }
    });

    eventSource.onerror = () => {
      console.warn('[SSE] Connection lost, reconnecting...');
      setStatus('disconnected');
      scheduleReconnect();
    };
  }

  /**
   * Schedule reconnection
   */
  function scheduleReconnect() {
    clearReconnect();
    reconnectTimer = setTimeout(() => {
      console.log('[SSE] Attempting reconnect...');
      connectSSE();
    }, 5000);
  }

  function clearReconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  }

  /**
   * Update connection status indicator
   */
  function setStatus(status) {
    if (!statusDot || !statusText) return;

    switch (status) {
      case 'connected':
        statusDot.className = 'status-dot';
        statusText.textContent = 'Live';
        break;
      case 'connecting':
        statusDot.className = 'status-dot';
        statusText.textContent = 'Connecting...';
        break;
      case 'disconnected':
        statusDot.className = 'status-dot status-dot--disconnected';
        statusText.textContent = 'Reconnecting...';
        break;
    }
  }
})();

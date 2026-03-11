/**
 * Mission Control — App
 */

(function () {
  'use strict';

  let state = null;
  let currentPage = 'dashboard';

  // DOM refs
  const connDot = document.getElementById('conn-dot');
  const connText = document.getElementById('conn-text');
  const pageTitle = document.getElementById('page-title');
  const pageSub = document.getElementById('page-subtitle');

  const pages = {
    dashboard: document.getElementById('page-dashboard'),
    sessions:  document.getElementById('page-sessions'),
    cron:      document.getElementById('page-cron'),
    memory:    document.getElementById('page-memory'),
    documents: document.getElementById('page-documents'),
    system:    document.getElementById('page-system'),
  };

  const pageMeta = {
    dashboard: { title: 'Overview',         sub: 'System health & activity at a glance' },
    sessions:  { title: 'AI Sessions',      sub: 'Active and recent agent conversations' },
    cron:      { title: 'Cron Jobs',         sub: 'Scheduled task management' },
    memory:    { title: 'Agent Memory',      sub: 'Knowledge files and daily logs' },
    documents: { title: 'Documents',         sub: 'Workspace files & knowledge base' },
    system:    { title: 'System',            sub: 'Server info and OpenClaw configuration' },
  };

  // ===== Navigation =====
  document.getElementById('sidebar-nav').addEventListener('click', (e) => {
    const item = e.target.closest('.nav-item');
    if (!item) return;
    const page = item.dataset.page;
    if (page) switchPage(page);
  });

  function switchPage(page) {
    currentPage = page;
    // Update nav
    document.querySelectorAll('.nav-item').forEach((el) => {
      el.classList.toggle('active', el.dataset.page === page);
    });
    // Show/hide pages
    Object.entries(pages).forEach(([id, el]) => {
      el.classList.toggle('page--hidden', id !== page);
    });
    // Update topbar
    const meta = pageMeta[page] || {};
    pageTitle.textContent = meta.title || page;
    pageSub.textContent = meta.sub || '';
    // Re-render
    if (state) renderPage(page, state);
  }

  // ===== Data Fetching =====
  async function init() {
    setConn('connecting');
    try {
      const res = await fetch('/api/state');
      state = await res.json();
      renderAll(state);
      setConn('connected');
    } catch (e) {
      setConn('disconnected');
    }
    connectSSE();
  }

  function connectSSE() {
    const es = new EventSource('/api/events');
    es.addEventListener('connected', () => setConn('connected'));
    es.addEventListener('update', (e) => {
      try {
        state = JSON.parse(e.data);
        renderAll(state);
        setConn('connected');
      } catch (err) { /* skip */ }
    });
    es.onerror = () => {
      setConn('disconnected');
      setTimeout(() => connectSSE(), 5000);
    };
  }

  function setConn(s) {
    if (s === 'connected') {
      connDot.className = 'connection-dot';
      connText.textContent = 'Live';
    } else if (s === 'connecting') {
      connDot.className = 'connection-dot';
      connText.textContent = 'Connecting...';
    } else {
      connDot.className = 'connection-dot connection-dot--off';
      connText.textContent = 'Reconnecting...';
    }
  }

  // ===== Render All =====
  function renderAll(s) {
    updateNavBadges(s);
    renderPage(currentPage, s);
  }

  function renderPage(page, s) {
    const fn = renderers[page];
    if (fn) fn(pages[page], s);
  }

  function updateNavBadges(s) {
    const sess = prov(s, 'sessions');
    document.getElementById('nav-sessions-count').textContent = sess?.total || 0;
  }

  // ===== Helpers =====
  function prov(s, id) { return s?.providers?.[id]?.data || null; }
  function esc(str) { return (str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function fmtTokens(n) { return n >= 1e6 ? (n/1e6).toFixed(1)+'M' : n >= 1e3 ? (n/1e3).toFixed(1)+'k' : String(n||0); }
  function fmtCost(n) { return n > 0 ? '$' + n.toFixed(4) : '$0.00'; }

  // ===== Page Renderers =====
  const renderers = {};

  // ----- DASHBOARD -----
  renderers.dashboard = (el, s) => {
    const sys = prov(s, 'system');
    const sess = prov(s, 'sessions');
    const cron = prov(s, 'cron');
    const mem = prov(s, 'memory');

    const totalTokens = (sess?.sessions || []).reduce((sum, x) => sum + (x.tokens||0), 0);
    const totalCost = (sess?.sessions || []).reduce((sum, x) => sum + (x.cost||0), 0);

    el.innerHTML = `
      <!-- Stat Cards -->
      <div class="stat-cards">
        <div class="stat-card">
          <div class="stat-card__icon stat-card__icon--cyan">🧠</div>
          <div class="stat-card__info">
            <div class="stat-card__label">Active Sessions</div>
            <div class="stat-card__value">${sess?.active || 0}/${sess?.total || 0}</div>
            <div class="stat-card__trend stat-card__trend--neutral">${sess?.recent || 0} recent</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-card__icon stat-card__icon--emerald">💰</div>
          <div class="stat-card__info">
            <div class="stat-card__label">Token Spend</div>
            <div class="stat-card__value">${fmtCost(totalCost)}</div>
            <div class="stat-card__trend stat-card__trend--neutral">${fmtTokens(totalTokens)} tokens</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-card__icon stat-card__icon--amber">⏰</div>
          <div class="stat-card__info">
            <div class="stat-card__label">Scheduled Jobs</div>
            <div class="stat-card__value">${cron?.total || 0}</div>
            <div class="stat-card__trend ${cron?.failing ? 'stat-card__trend--down' : 'stat-card__trend--up'}">${cron?.failing ? cron.failing + ' failing' : cron?.enabled + ' enabled'}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-card__icon stat-card__icon--violet">📝</div>
          <div class="stat-card__info">
            <div class="stat-card__label">Memory Files</div>
            <div class="stat-card__value">${mem?.totalFiles || 0}</div>
            <div class="stat-card__trend stat-card__trend--neutral">${mem?.totalSizeFormatted || '0 B'}</div>
          </div>
        </div>
      </div>

      <!-- Middle Row: Sessions + Cron Jobs -->
      <div class="content-grid content-grid--3-2">
        <!-- Sessions Panel -->
        <div class="panel">
          <div class="panel__header">
            <span class="panel__title">Session Activity</span>
            <span class="panel__badge">${sess?.total || 0} sessions</span>
          </div>
          ${renderSessionsList(sess?.sessions || [])}
        </div>

        <!-- Cron Panel -->
        <div class="panel">
          <div class="panel__header">
            <span class="panel__title">Cron Jobs</span>
            <span class="panel__badge">${cron?.enabled || 0} active</span>
          </div>
          ${renderCronList(cron?.jobs || [])}
        </div>
      </div>

      <!-- Bottom Row: Activity + System -->
      <div class="content-grid">
        <!-- Recent Activity -->
        <div class="panel">
          <div class="panel__header">
            <span class="panel__title">Recent Activity</span>
          </div>
          ${renderActivity(mem)}
        </div>

        <!-- System Info -->
        <div class="panel">
          <div class="panel__header">
            <span class="panel__title">System Info</span>
          </div>
          ${renderSystemCompact(sys)}
        </div>
      </div>
    `;
  };

  function renderSessionsList(sessions) {
    if (!sessions.length) return '<div class="empty"><div class="empty__icon">🧠</div><div class="empty__text">No sessions found</div></div>';
    const colors = ['cyan','emerald','blue','violet','amber','rose'];
    return sessions.slice(0, 6).map((s, i) => {
      const c = colors[i % colors.length];
      const dotClass = s.active ? 'active' : s.recentlyActive ? 'recent' : 'idle';
      const initial = (s.model || '?')[0].toUpperCase();
      const shortModel = (s.model || 'unknown').replace('claude-','').replace('-20250514','');
      return `
        <div class="list-item">
          <div class="list-item__avatar list-item__avatar--${c}">${initial}</div>
          <div class="list-item__body">
            <div class="list-item__name">${esc(s.preview || s.label)}</div>
            <div class="list-item__sub">${shortModel} · ${fmtTokens(s.tokens)} tokens</div>
          </div>
          <div class="list-item__status"><span class="dot dot--${dotClass}"></span></div>
        </div>`;
    }).join('');
  }

  function renderCronList(jobs) {
    if (!jobs.length) return '<div class="empty"><div class="empty__icon">⏰</div><div class="empty__text">No cron jobs</div></div>';
    return jobs.map((j) => {
      const statusClass = !j.enabled ? 'disabled' : j.lastStatus === 'failure' ? 'error' : 'success';
      const statusLabel = !j.enabled ? 'disabled' : j.lastStatus || 'pending';
      return `
        <div class="list-item">
          <div class="list-item__body">
            <div class="list-item__name">${esc(j.name)}</div>
            <div class="list-item__sub">${j.scheduleHuman || j.schedule}${j.nextRun ? ' · next: ' + j.nextRun : ''}</div>
          </div>
          <div class="list-item__status"><span class="status-tag status-tag--${statusClass}">${statusLabel}</span></div>
        </div>`;
    }).join('');
  }

  function renderActivity(mem) {
    const entries = mem?.recentEntries || [];
    const files = mem?.files || [];
    const items = [];
    entries.forEach((e) => {
      const icon = e.includes('✅') ? 'success' : e.includes('❌') ? 'error' : 'info';
      items.push({ text: e, icon, meta: 'today' });
    });
    if (!items.length && files.length) {
      files.slice(0, 4).forEach((f) => {
        items.push({ text: `Memory file updated: ${f.name}`, icon: 'info', meta: f.age });
      });
    }
    if (!items.length) return '<div class="empty"><div class="empty__icon">📋</div><div class="empty__text">No recent activity</div></div>';
    return items.map((a) => `
      <div class="activity-item">
        <div class="activity-item__icon activity-item__icon--${a.icon}">●</div>
        <div class="activity-item__body">
          <div class="activity-item__text">${esc(a.text)}</div>
          <div class="activity-item__meta">${a.meta}</div>
        </div>
      </div>`).join('');
  }

  function renderSystemCompact(sys) {
    if (!sys) return '<div class="empty"><div class="empty__icon">📡</div><div class="empty__text">System data unavailable</div></div>';
    const cfg = sys.openclawConfig;
    return `
      <div class="detail-row"><span class="detail-row__label">Hostname</span><span class="detail-row__value">${esc(sys.hostname)}</span></div>
      <div class="detail-row"><span class="detail-row__label">Uptime</span><span class="detail-row__value">${esc(sys.uptime)}</span></div>
      <div class="detail-row"><span class="detail-row__label">Platform</span><span class="detail-row__value">${sys.platform} / ${sys.arch}</span></div>
      <div class="detail-row"><span class="detail-row__label">Node.js</span><span class="detail-row__value">${sys.nodeVersion}</span></div>
      ${cfg ? `
        <div class="detail-row"><span class="detail-row__label">Model</span><span class="model-tag">${cfg.model || '—'}</span></div>
        <div class="detail-row"><span class="detail-row__label">Max Sessions</span><span class="detail-row__value">${cfg.maxConcurrent || '—'}</span></div>
        <div class="detail-row"><span class="detail-row__label">Max Subagents</span><span class="detail-row__value">${cfg.subagentMax || '—'}</span></div>
        <div class="detail-row"><span class="detail-row__label">Integrations</span><span class="detail-row__value">${[cfg.hasSlack?'Slack':null,cfg.hasTelegram?'Telegram':null].filter(Boolean).join(', ')||'None'}</span></div>
      ` : ''}`;
  }

  // ----- SESSIONS PAGE -----
  renderers.sessions = (el, s) => {
    const sess = prov(s, 'sessions');
    const sessions = sess?.sessions || [];
    const colors = ['cyan','emerald','blue','violet','amber','rose'];

    el.innerHTML = `
      <div class="stat-cards" style="grid-template-columns: repeat(3, 1fr);">
        <div class="stat-card">
          <div class="stat-card__icon stat-card__icon--cyan">📊</div>
          <div class="stat-card__info">
            <div class="stat-card__label">Total Sessions</div>
            <div class="stat-card__value">${sess?.total || 0}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-card__icon stat-card__icon--emerald">⚡</div>
          <div class="stat-card__info">
            <div class="stat-card__label">Active Now</div>
            <div class="stat-card__value">${sess?.active || 0}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-card__icon stat-card__icon--amber">🕐</div>
          <div class="stat-card__info">
            <div class="stat-card__label">Recent</div>
            <div class="stat-card__value">${sess?.recent || 0}</div>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel__header">
          <span class="panel__title">All Sessions</span>
        </div>
        ${sessions.map((s, i) => {
          const c = colors[i % colors.length];
          const dotClass = s.active ? 'active' : s.recentlyActive ? 'recent' : 'idle';
          const shortModel = (s.model || 'unknown').replace('claude-','').replace('-20250514','');
          return `
            <div class="list-item">
              <div class="list-item__avatar list-item__avatar--${c}">${s.channel[0].toUpperCase()}</div>
              <div class="list-item__body">
                <div class="list-item__name">${esc(s.preview || s.label)}</div>
                <div class="list-item__sub">${s.channel} · ${s.messageCount} msgs · ${fmtTokens(s.tokens)} tokens · ${fmtCost(s.cost)} · ${s.minutesAgo}m ago</div>
              </div>
              <div class="list-item__status" style="display:flex;gap:8px;align-items:center;">
                <span class="model-tag">${shortModel}</span>
                <span class="dot dot--${dotClass}"></span>
              </div>
            </div>`;
        }).join('') || '<div class="empty"><div class="empty__icon">🧠</div><div class="empty__text">No sessions</div></div>'}
      </div>
    `;
  };

  // ----- CRON PAGE -----
  renderers.cron = (el, s) => {
    const cron = prov(s, 'cron');
    const jobs = cron?.jobs || [];

    el.innerHTML = `
      <div class="stat-cards" style="grid-template-columns: repeat(4, 1fr);">
        <div class="stat-card">
          <div class="stat-card__icon stat-card__icon--cyan">📋</div>
          <div class="stat-card__info"><div class="stat-card__label">Total</div><div class="stat-card__value">${cron?.total||0}</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-card__icon stat-card__icon--emerald">✅</div>
          <div class="stat-card__info"><div class="stat-card__label">Enabled</div><div class="stat-card__value">${cron?.enabled||0}</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-card__icon stat-card__icon--amber">⚠️</div>
          <div class="stat-card__info"><div class="stat-card__label">Failing</div><div class="stat-card__value">${cron?.failing||0}</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-card__icon stat-card__icon--violet">🚫</div>
          <div class="stat-card__info"><div class="stat-card__label">Disabled</div><div class="stat-card__value">${cron?.disabled||0}</div></div>
        </div>
      </div>

      <div class="panel">
        <div class="panel__header"><span class="panel__title">All Cron Jobs</span></div>
        ${jobs.map((j) => {
          const sc = !j.enabled ? 'disabled' : j.lastStatus === 'failure' ? 'error' : 'success';
          const sl = !j.enabled ? 'disabled' : j.lastStatus || 'pending';
          return `
            <div class="list-item">
              <div class="list-item__body">
                <div class="list-item__name">${esc(j.name)}</div>
                <div class="list-item__sub">
                  <span class="tag">${j.scheduleHuman || j.schedule}</span>
                  ${j.nextRun ? '· next: ' + j.nextRun : ''}
                  ${j.lastRunAt ? '· last: ' + new Date(j.lastRunAt).toLocaleDateString() : ''}
                </div>
              </div>
              <span class="status-tag status-tag--${sc}">${sl}</span>
            </div>`;
        }).join('') || '<div class="empty"><div class="empty__icon">⏰</div><div class="empty__text">No cron jobs</div></div>'}
      </div>
    `;
  };

  // ----- MEMORY PAGE -----
  renderers.memory = (el, s) => {
    const mem = prov(s, 'memory');
    const ltm = mem?.longTermMemory;

    el.innerHTML = `
      <div class="stat-cards" style="grid-template-columns: repeat(3, 1fr);">
        <div class="stat-card">
          <div class="stat-card__icon stat-card__icon--violet">📄</div>
          <div class="stat-card__info"><div class="stat-card__label">Total Files</div><div class="stat-card__value">${mem?.totalFiles||0}</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-card__icon stat-card__icon--cyan">💾</div>
          <div class="stat-card__info"><div class="stat-card__label">Total Size</div><div class="stat-card__value">${mem?.totalSizeFormatted||'0 B'}</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-card__icon stat-card__icon--emerald">📏</div>
          <div class="stat-card__info"><div class="stat-card__label">Memory Lines</div><div class="stat-card__value">${ltm?.lines||0}</div></div>
        </div>
      </div>

      <div class="content-grid">
        <!-- Long-term memory preview -->
        <div class="panel">
          <div class="panel__header"><span class="panel__title">Long-Term Memory (MEMORY.md)</span><span class="panel__badge">${ltm?.sizeFormatted||''}</span></div>
          ${ltm?.preview ? `<pre style="font-size:var(--fs-sm);color:var(--text-secondary);white-space:pre-wrap;line-height:1.6;max-height:320px;overflow:auto;">${esc(ltm.preview)}</pre>` : '<div class="empty"><div class="empty__text">No MEMORY.md found</div></div>'}
        </div>

        <!-- Files list -->
        <div class="panel">
          <div class="panel__header"><span class="panel__title">Memory Files</span></div>
          ${(mem?.files||[]).map((f) => `
            <div class="list-item">
              <div class="list-item__avatar list-item__avatar--violet">📄</div>
              <div class="list-item__body">
                <div class="list-item__name" style="font-family:var(--font-mono);">${esc(f.name)}</div>
                <div class="list-item__sub">${f.sizeFormatted} · ${f.age}</div>
              </div>
            </div>`).join('') || '<div class="empty"><div class="empty__text">No files</div></div>'}
        </div>
      </div>
    `;
  };

  // ----- SYSTEM PAGE -----
  renderers.system = (el, s) => {
    const sys = prov(s, 'system');
    if (!sys) { el.innerHTML = '<div class="empty"><div class="empty__icon">📡</div><div class="empty__text">System data unavailable</div></div>'; return; }
    const cfg = sys.openclawConfig;

    el.innerHTML = `
      <div class="content-grid">
        <div class="panel">
          <div class="panel__header"><span class="panel__title">Server</span></div>
          <div class="detail-row"><span class="detail-row__label">Hostname</span><span class="detail-row__value">${esc(sys.hostname)}</span></div>
          <div class="detail-row"><span class="detail-row__label">Platform</span><span class="detail-row__value">${sys.platform} / ${sys.arch}</span></div>
          <div class="detail-row"><span class="detail-row__label">Uptime</span><span class="detail-row__value">${esc(sys.uptime)}</span></div>
          <div class="detail-row"><span class="detail-row__label">Node.js</span><span class="detail-row__value">${sys.nodeVersion}</span></div>
        </div>
        <div class="panel">
          <div class="panel__header"><span class="panel__title">OpenClaw Config</span></div>
          ${cfg ? `
            <div class="detail-row"><span class="detail-row__label">Default Model</span><span class="model-tag">${cfg.model||'—'}</span></div>
            <div class="detail-row"><span class="detail-row__label">Max Concurrent</span><span class="detail-row__value">${cfg.maxConcurrent||'—'}</span></div>
            <div class="detail-row"><span class="detail-row__label">Max Subagents</span><span class="detail-row__value">${cfg.subagentMax||'—'}</span></div>
            <div class="detail-row"><span class="detail-row__label">Slack</span><span class="detail-row__value">${cfg.hasSlack?'Connected':'—'}</span></div>
            <div class="detail-row"><span class="detail-row__label">Telegram</span><span class="detail-row__value">${cfg.hasTelegram?'Connected':'—'}</span></div>
          ` : '<div class="empty"><div class="empty__text">No config file found</div></div>'}
        </div>
      </div>

      <div class="panel" style="margin-top:var(--sp-5);">
        <div class="panel__header"><span class="panel__title">Paths</span></div>
        <div class="detail-row"><span class="detail-row__label">Home</span><span class="detail-row__value" style="font-size:var(--fs-xs);">${esc(sys.paths?.home)}</span></div>
        <div class="detail-row"><span class="detail-row__label">Workspace</span><span class="detail-row__value" style="font-size:var(--fs-xs);">${esc(sys.paths?.workspace)}</span></div>
      </div>
    `;
  };

  // ----- DOCUMENTS PAGE -----
  let docsTreeLoaded = false;
  let docsSelectedFile = null;
  const docsExpandedDirs = new Set();
  const docsTreeCache = new Map();

  renderers.documents = (el) => {
    // Only render shell once, then manage tree interactively
    if (!docsTreeLoaded) {
      el.innerHTML = `
        <div class="docs-layout">
          <div class="file-tree">
            <div class="file-tree__header">
              <span class="file-tree__header-icon">📂</span>
              WORKSPACE
            </div>
            <div id="docs-tree"><div class="tree-loading">Loading...</div></div>
          </div>
          <div class="file-viewer" id="docs-viewer">
            <div class="file-viewer__empty">
              <div class="file-viewer__empty-icon">📄</div>
              <div class="file-viewer__empty-text">Select a file to view its contents</div>
            </div>
          </div>
        </div>
      `;
      docsTreeLoaded = true;
      loadTreeDir('', document.getElementById('docs-tree'));
    }
  };

  async function loadTreeDir(dirPath, container) {
    if (docsTreeCache.has(dirPath)) {
      renderTreeEntries(docsTreeCache.get(dirPath), container, dirPath);
      return;
    }
    container.innerHTML = '<div class="tree-loading">Loading...</div>';
    try {
      const url = dirPath ? `/api/files?path=${encodeURIComponent(dirPath)}` : '/api/files';
      const res = await fetch(url);
      const data = await res.json();
      docsTreeCache.set(dirPath, data.entries || []);
      renderTreeEntries(data.entries || [], container, dirPath);
    } catch (e) {
      container.innerHTML = '<div class="tree-loading">Failed to load</div>';
    }
  }

  function renderTreeEntries(entries, container, parentPath) {
    container.innerHTML = '';
    for (const entry of entries) {
      const node = document.createElement('div');
      node.className = 'tree-node';

      const isDir = entry.type === 'directory';
      const isExpanded = docsExpandedDirs.has(entry.path);
      const isSelected = docsSelectedFile === entry.path;
      const icon = isDir ? (isExpanded ? '📂' : '📁') : getFileIcon(entry.extension);

      const row = document.createElement('div');
      row.className = 'tree-node__row' + (isSelected ? ' active' : '');
      row.innerHTML = `
        <span class="tree-node__arrow ${isDir ? (isExpanded ? 'tree-node__arrow--open' : '') : 'tree-node__arrow--hidden'}">▶</span>
        <span class="tree-node__icon">${icon}</span>
        <span class="tree-node__name">${esc(entry.name)}</span>
      `;

      node.appendChild(row);

      if (isDir) {
        const children = document.createElement('div');
        children.className = 'tree-node__children' + (isExpanded ? '' : ' tree-node__children--hidden');
        node.appendChild(children);

        row.addEventListener('click', () => {
          if (docsExpandedDirs.has(entry.path)) {
            docsExpandedDirs.delete(entry.path);
            children.classList.add('tree-node__children--hidden');
            row.querySelector('.tree-node__arrow').classList.remove('tree-node__arrow--open');
            row.querySelector('.tree-node__icon').textContent = '📁';
          } else {
            docsExpandedDirs.add(entry.path);
            children.classList.remove('tree-node__children--hidden');
            row.querySelector('.tree-node__arrow').classList.add('tree-node__arrow--open');
            row.querySelector('.tree-node__icon').textContent = '📂';
            loadTreeDir(entry.path, children);
          }
        });

        // If already expanded, load children
        if (isExpanded) {
          loadTreeDir(entry.path, children);
        }
      } else {
        row.addEventListener('click', () => {
          docsSelectedFile = entry.path;
          // Update active state
          document.querySelectorAll('.tree-node__row.active').forEach((el) => el.classList.remove('active'));
          row.classList.add('active');
          loadFileContent(entry);
        });
      }

      container.appendChild(node);
    }

    if (!entries.length) {
      container.innerHTML = '<div class="tree-loading">Empty folder</div>';
    }
  }

  async function loadFileContent(entry) {
    const viewer = document.getElementById('docs-viewer');
    viewer.innerHTML = `
      <div class="file-viewer__header">
        <div class="file-viewer__title">
          <div class="file-viewer__icon">${getFileIcon(entry.extension)}</div>
          <div>
            <div class="file-viewer__name">${esc(entry.name)}</div>
            <div class="file-viewer__meta">${entry.sizeFormatted || ''} · Last updated: ${formatDate(entry.modified)}</div>
          </div>
        </div>
      </div>
      <div class="file-viewer__content"><div class="tree-loading">Loading...</div></div>
    `;

    try {
      const res = await fetch(`/api/files?path=${encodeURIComponent(entry.path)}&content=true`);
      const data = await res.json();
      const contentArea = viewer.querySelector('.file-viewer__content');

      if (data.error) {
        contentArea.innerHTML = `<div class="empty"><div class="empty__text">${esc(data.error)}</div></div>`;
        return;
      }

      if (data.extension === '.json') {
        contentArea.innerHTML = `<pre class="file-viewer__pre">${syntaxHighlightJSON(data.content)}</pre>`;
      } else if (data.extension === '.md') {
        contentArea.innerHTML = `<div class="file-viewer__markdown">${renderMarkdown(data.content)}</div>`;
      } else {
        contentArea.innerHTML = `<pre class="file-viewer__pre">${esc(data.content)}</pre>`;
      }
    } catch (e) {
      viewer.querySelector('.file-viewer__content').innerHTML = '<div class="empty"><div class="empty__text">Failed to load file</div></div>';
    }
  }

  function getFileIcon(ext) {
    const icons = { '.md': '📄', '.json': '📋', '.txt': '📝', '.yml': '⚙️', '.yaml': '⚙️', '.sh': '💻', '.js': '📜', '.log': '📃' };
    return icons[ext] || '📄';
  }

  function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function syntaxHighlightJSON(jsonStr) {
    try {
      const formatted = JSON.stringify(JSON.parse(jsonStr), null, 2);
      return formatted
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/("[^"]+")\s*:/g, '<span class="json-key">$1</span>:')
        .replace(/:\s*("[^"]*")/g, ': <span class="json-string">$1</span>')
        .replace(/:\s*(-?\d+\.?\d*)/g, ': <span class="json-number">$1</span>')
        .replace(/:\s*(true|false)/g, ': <span class="json-bool">$1</span>')
        .replace(/:\s*(null)/g, ': <span class="json-null">$1</span>');
    } catch (e) {
      return esc(jsonStr);
    }
  }

  function renderMarkdown(md) {
    return md
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      // Code blocks
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Headers
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      // Bold / Italic
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      // Horizontal rule
      .replace(/^---$/gm, '<hr>')
      // Unordered lists
      .replace(/^- \[x\] (.+)$/gm, '<li>✅ $1</li>')
      .replace(/^- \[ \] (.+)$/gm, '<li>☐ $1</li>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      // Ordered lists
      .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
      // Wrap consecutive <li> in <ul>
      .replace(/(<li>.*<\/li>\n?)+/g, (match) => '<ul>' + match + '</ul>')
      // Paragraphs (double newlines)
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(?!<[huplo])(.+)$/gm, '<p>$1</p>')
      // Clean empty paragraphs
      .replace(/<p><\/p>/g, '')
      .replace(/<p>(<[huo])/g, '$1')
      .replace(/(<\/[huo]l>)<\/p>/g, '$1');
  }

  // ===== Start =====
  init();
})();

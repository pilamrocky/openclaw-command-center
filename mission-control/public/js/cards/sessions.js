/**
 * Sessions Card — Renders AI sessions provider data
 */

CardEngine.register('sessions', (data) => {
  const { sessions, total, active, recent } = data;

  if (!sessions || sessions.length === 0) {
    return `
      <div class="card card--accent-emerald">
        <div class="card__header">
          <span class="card__title">🧠 AI Sessions</span>
        </div>
        <div class="card__body">
          <div class="empty-state">
            <div class="empty-state__icon">🧠</div>
            <p>No sessions found</p>
          </div>
        </div>
      </div>
    `;
  }

  // Summary stats
  const statsHTML = `
    <div class="stat-grid">
      <div class="stat-box">
        <div class="stat-box__value">${total}</div>
        <div class="stat-box__label">Total</div>
      </div>
      <div class="stat-box">
        <div class="stat-box__value" style="color: var(--status-active)">${active}</div>
        <div class="stat-box__label">Active</div>
      </div>
      <div class="stat-box">
        <div class="stat-box__value" style="color: var(--status-recent)">${recent}</div>
        <div class="stat-box__label">Recent</div>
      </div>
    </div>
  `;

  // Session list (show up to 5)
  const listHTML = sessions.slice(0, 5).map((s) => {
    const status = s.active ? 'active' : s.recentlyActive ? 'recent' : 'idle';
    const statusLabel = s.active ? 'live' : s.recentlyActive ? `${s.minutesAgo}m ago` : `${s.minutesAgo}m ago`;
    const tokens = formatTokens(s.tokens);

    return `
      <div class="item">
        <div class="item__main">
          <span class="item__title">${escapeHtml(s.preview || s.label)}</span>
          <span class="item__subtitle">${s.channel} · ${tokens} tokens</span>
        </div>
        <div class="item__meta">
          <span class="badge badge--model">${s.model}</span>
          <span class="badge badge--${status}">${statusLabel}</span>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="card card--accent-emerald" style="grid-column: 1 / -1;">
      <div class="card__header">
        <span class="card__title">🧠 AI Sessions</span>
        <span class="badge badge--active">${active} live</span>
      </div>
      <div class="card__body">
        ${statsHTML}
        <div class="item-list mt-md">
          ${listHTML}
        </div>
        ${total > 5 ? `<p class="text-muted text-xs mt-sm" style="text-align: center;">+ ${total - 5} more sessions</p>` : ''}
      </div>
    </div>
  `;
});

function formatTokens(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

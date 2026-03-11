/**
 * System Card — Renders system info provider data
 */

CardEngine.register('system', (data) => {
  const config = data.openclawConfig;

  return `
    <div class="card card--accent-cyan">
      <div class="card__header">
        <span class="card__title">📡 System Info</span>
        <span class="badge badge--active">online</span>
      </div>
      <div class="card__body">
        <div class="stat-row">
          <span class="stat-row__label">Hostname</span>
          <span class="stat-row__value">${data.hostname}</span>
        </div>
        <div class="stat-row">
          <span class="stat-row__label">Uptime</span>
          <span class="stat-row__value">${data.uptime}</span>
        </div>
        <div class="stat-row">
          <span class="stat-row__label">Platform</span>
          <span class="stat-row__value">${data.platform} / ${data.arch}</span>
        </div>
        <div class="stat-row">
          <span class="stat-row__label">Node.js</span>
          <span class="stat-row__value">${data.nodeVersion}</span>
        </div>
        ${config ? `
          <div style="margin-top: var(--space-md); padding-top: var(--space-md); border-top: 1px solid var(--border-subtle);">
            <div class="stat-row">
              <span class="stat-row__label">Default Model</span>
              <span class="badge badge--model">${config.model || '—'}</span>
            </div>
            <div class="stat-row">
              <span class="stat-row__label">Max Sessions</span>
              <span class="stat-row__value">${config.maxConcurrent || '—'}</span>
            </div>
            <div class="stat-row">
              <span class="stat-row__label">Max Subagents</span>
              <span class="stat-row__value">${config.subagentMax || '—'}</span>
            </div>
            <div class="stat-row">
              <span class="stat-row__label">Integrations</span>
              <span class="stat-row__value">${[
                config.hasSlack ? 'Slack' : null,
                config.hasTelegram ? 'Telegram' : null
              ].filter(Boolean).join(', ') || 'None'}</span>
            </div>
          </div>
        ` : `
          <div class="empty-state mt-md">
            <p>No OpenClaw config found</p>
          </div>
        `}
      </div>
    </div>
  `;
});

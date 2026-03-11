/**
 * Cron Card — Renders cron jobs provider data
 */

CardEngine.register('cron', (data) => {
  const { jobs, total, enabled, failing } = data;

  if (!jobs || jobs.length === 0) {
    return `
      <div class="card card--accent-amber">
        <div class="card__header">
          <span class="card__title">⏰ Cron Jobs</span>
        </div>
        <div class="card__body">
          <div class="empty-state">
            <div class="empty-state__icon">⏰</div>
            <p>No cron jobs configured</p>
          </div>
        </div>
      </div>
    `;
  }

  const listHTML = jobs.map((job) => {
    const statusClass = !job.enabled
      ? 'disabled'
      : job.lastStatus === 'failure'
        ? 'error'
        : job.lastStatus === 'success'
          ? 'success'
          : 'idle';

    const statusLabel = !job.enabled
      ? 'disabled'
      : job.lastStatus || 'pending';

    return `
      <div class="item">
        <div class="item__main">
          <span class="item__title">${escapeHtml(job.name)}</span>
          <span class="item__subtitle">${job.scheduleHuman || job.schedule}${job.nextRun ? ` · next: ${job.nextRun}` : ''}</span>
        </div>
        <div class="item__meta">
          <span class="badge badge--${statusClass}">${statusLabel}</span>
        </div>
      </div>
    `;
  }).join('');

  const summaryParts = [`${enabled} enabled`];
  if (failing) summaryParts.push(`${failing} failing`);

  return `
    <div class="card card--accent-amber" style="grid-column: 1 / -1;">
      <div class="card__header">
        <span class="card__title">⏰ Cron Jobs</span>
        <span class="section__badge">${summaryParts.join(' · ')}</span>
      </div>
      <div class="card__body">
        <div class="item-list">
          ${listHTML}
        </div>
      </div>
    </div>
  `;
});

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

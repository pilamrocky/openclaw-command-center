/**
 * Memory Card — Renders agent memory/knowledge data
 */

CardEngine.register('memory', (data) => {
  const { files, totalFiles, totalSizeFormatted, longTermMemory, recentEntries } = data;

  return `
    <div class="card card--accent-violet">
      <div class="card__header">
        <span class="card__title">📝 Agent Memory</span>
        <span class="section__badge">${totalFiles} files · ${totalSizeFormatted}</span>
      </div>
      <div class="card__body">
        ${longTermMemory ? `
          <div class="stat-grid" style="grid-template-columns: repeat(3, 1fr);">
            <div class="stat-box">
              <div class="stat-box__value">${totalFiles}</div>
              <div class="stat-box__label">Files</div>
            </div>
            <div class="stat-box">
              <div class="stat-box__value">${totalSizeFormatted}</div>
              <div class="stat-box__label">Total Size</div>
            </div>
            <div class="stat-box">
              <div class="stat-box__value">${longTermMemory.lines}</div>
              <div class="stat-box__label">Memory Lines</div>
            </div>
          </div>
        ` : ''}

        ${recentEntries.length > 0 ? `
          <div style="margin-top: var(--space-md);">
            <p class="text-xs text-muted" style="margin-bottom: var(--space-sm); text-transform: uppercase; letter-spacing: 0.05em;">Today's Activity</p>
            <div class="item-list">
              ${recentEntries.map((entry) => `
                <div class="item">
                  <div class="item__main">
                    <span class="item__title">${escapeHtml(entry)}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${files.length > 0 ? `
          <div style="margin-top: var(--space-md);">
            <p class="text-xs text-muted" style="margin-bottom: var(--space-sm); text-transform: uppercase; letter-spacing: 0.05em;">Recent Files</p>
            <div class="item-list">
              ${files.slice(0, 5).map((f) => `
                <div class="item">
                  <div class="item__main">
                    <span class="item__title mono">${escapeHtml(f.name)}</span>
                    <span class="item__subtitle">${f.sizeFormatted} · ${f.age}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : `
          <div class="empty-state mt-md">
            <div class="empty-state__icon">📝</div>
            <p>No memory files found</p>
          </div>
        `}
      </div>
    </div>
  `;
});

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

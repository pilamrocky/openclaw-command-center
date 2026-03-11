/**
 * Cron Provider — Reads OpenClaw cron job definitions
 * Category: tasks
 *
 * Parses ~/.openclaw/cron/jobs.json for scheduled task info.
 */

const fs = require('fs');
const path = require('path');

module.exports = {
  id: 'cron',
  name: 'Cron Jobs',
  icon: '⏰',
  category: 'tasks',
  refreshInterval: 30000,

  async getData({ config }) {
    const cronPath = path.join(config.paths.cron, 'jobs.json');

    if (!fs.existsSync(cronPath)) {
      return { jobs: [], total: 0 };
    }

    try {
      const content = fs.readFileSync(cronPath, 'utf8');
      const data = JSON.parse(content);
      const jobs = (data.jobs || []).map(formatJob);

      return {
        jobs,
        total: jobs.length,
        enabled: jobs.filter((j) => j.enabled).length,
        disabled: jobs.filter((j) => !j.enabled).length,
        healthy: jobs.filter((j) => j.lastStatus === 'success').length,
        failing: jobs.filter((j) => j.lastStatus === 'failure').length,
      };
    } catch (e) {
      console.error('[Cron] Error reading jobs:', e.message);
      return { jobs: [], total: 0, error: e.message };
    }
  },
};

function formatJob(job) {
  const scheduleHuman = job.schedule?.kind === 'cron' && job.schedule?.expr
    ? cronToHuman(job.schedule.expr)
    : job.schedule?.kind === 'once'
      ? 'One-time'
      : null;

  let nextRun = null;
  if (job.state?.nextRunAtMs) {
    const diffMs = job.state.nextRunAtMs - Date.now();
    const diffMins = Math.round(diffMs / 60000);
    if (diffMins < 0) nextRun = 'overdue';
    else if (diffMins < 60) nextRun = `${diffMins}m`;
    else if (diffMins < 1440) nextRun = `${Math.round(diffMins / 60)}h`;
    else nextRun = `${Math.round(diffMins / 1440)}d`;
  }

  return {
    id: job.id,
    name: job.name || job.id,
    schedule: job.schedule?.expr || '—',
    scheduleHuman,
    nextRun,
    enabled: job.enabled !== false,
    lastStatus: job.state?.lastStatus || null,
    lastRunAt: job.state?.lastRunAtMs ? new Date(job.state.lastRunAtMs).toISOString() : null,
  };
}

/**
 * Convert cron expression to human-readable text
 */
function cronToHuman(expr) {
  const parts = expr.split(' ');
  if (parts.length < 5) return null;

  const [minute, hour, dom, month, dow] = parts;

  if (minute === '*' && hour === '*') return 'Every minute';
  if (minute.startsWith('*/')) return `Every ${minute.slice(2)} minutes`;
  if (hour.startsWith('*/')) return `Every ${hour.slice(2)} hours`;

  let timeStr = null;
  if (minute !== '*' && hour !== '*' && !hour.startsWith('*/')) {
    const h = parseInt(hour, 10);
    const m = parseInt(minute, 10);
    const ampm = h >= 12 ? 'pm' : 'am';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    timeStr = m === 0 ? `${h12}${ampm}` : `${h12}:${String(m).padStart(2, '0')}${ampm}`;
  }

  if (minute !== '*' && hour === '*') return `Hourly at :${minute.padStart(2, '0')}`;
  if (timeStr && dom === '*' && month === '*' && dow === '*') return `Daily at ${timeStr}`;
  if (timeStr && (dow === '1-5' || dow === 'MON-FRI')) return `Weekdays at ${timeStr}`;

  // Handle comma-separated hours
  if (hour.includes(',') && timeStr === null) {
    const hours = hour.split(',').map((h) => {
      const n = parseInt(h, 10);
      const ap = n >= 12 ? 'pm' : 'am';
      const h12 = n === 0 ? 12 : n > 12 ? n - 12 : n;
      return `${h12}${ap}`;
    });
    const prefix = dow === '1-5' ? 'Weekdays' : 'Daily';
    return `${prefix} at ${hours.join(' & ')}`;
  }

  if (timeStr) return `At ${timeStr}`;
  return expr;
}

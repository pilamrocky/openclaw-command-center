/**
 * System Provider — Reads OpenClaw config and system info
 * Category: system
 */

const fs = require('fs');
const os = require('os');

module.exports = {
  id: 'system',
  name: 'System Info',
  icon: '📡',
  category: 'system',
  refreshInterval: 30000,

  async getData({ config }) {
    const result = {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      uptime: formatUptime(os.uptime()),
      nodeVersion: process.version,
      openclawConfig: null,
      paths: {
        home: config.paths.openclawHome,
        workspace: config.paths.workspace,
      },
    };

    // Read openclaw.json config
    try {
      const configPath = config.paths.config;
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf8');
        const parsed = JSON.parse(content);
        result.openclawConfig = {
          maxConcurrent: parsed.agents?.defaults?.maxConcurrent || null,
          model: parsed.agents?.defaults?.model || null,
          subagentMax: parsed.agents?.defaults?.subagents?.maxConcurrent || null,
          hasSlack: !!parsed.gateway?.slack,
          hasTelegram: !!parsed.gateway?.telegram,
        };
      }
    } catch (e) {
      // Config not readable, that's fine
    }

    return result;
  },
};

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

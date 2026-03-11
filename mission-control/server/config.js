/**
 * Mission Control — Configuration
 *
 * Auto-detects OpenClaw directories and loads settings.
 * Priority: ENV vars > auto-detection > defaults
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const HOME = os.homedir();

/**
 * Detect the OpenClaw home directory (~/.openclaw or custom)
 */
function detectOpenClawHome() {
  // Explicit env var (highest priority)
  if (process.env.OPENCLAW_HOME && fs.existsSync(process.env.OPENCLAW_HOME)) {
    return path.resolve(process.env.OPENCLAW_HOME);
  }

  // Profile-aware: ~/.openclaw-<profile>
  const profile = process.env.OPENCLAW_PROFILE || '';
  const dir = profile
    ? path.join(HOME, `.openclaw-${profile}`)
    : path.join(HOME, '.openclaw');

  if (fs.existsSync(dir)) return dir;

  // Fallback
  return path.join(HOME, '.openclaw');
}

/**
 * Detect the OpenClaw workspace directory
 */
function detectWorkspace(openclawHome) {
  if (process.env.OPENCLAW_WORKSPACE && fs.existsSync(process.env.OPENCLAW_WORKSPACE)) {
    return path.resolve(process.env.OPENCLAW_WORKSPACE);
  }

  const candidates = [
    path.join(openclawHome, 'workspace'),
    path.join(HOME, 'openclaw-workspace'),
    path.join(HOME, '.openclaw-workspace'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return path.join(openclawHome, 'workspace');
}

/**
 * Build the full configuration object
 */
function loadConfig() {
  const openclawHome = detectOpenClawHome();
  const workspace = detectWorkspace(openclawHome);

  return {
    server: {
      port: parseInt(process.env.PORT || '3333', 10),
      host: process.env.HOST || 'localhost',
    },
    paths: {
      openclawHome,
      workspace,
      sessions: path.join(openclawHome, 'agents', 'main', 'sessions'),
      cron: path.join(openclawHome, 'cron'),
      memory: path.join(workspace, 'memory'),
      state: path.join(workspace, 'state'),
      config: path.join(openclawHome, 'openclaw.json'),
    },
    auth: {
      mode: process.env.DASHBOARD_AUTH_MODE || 'none',
    },
  };
}

const CONFIG = loadConfig();

// Startup log
console.log('[Config] OpenClaw home:', CONFIG.paths.openclawHome);
console.log('[Config] Workspace:', CONFIG.paths.workspace);
console.log('[Config] Auth mode:', CONFIG.auth.mode);

module.exports = { CONFIG, loadConfig };

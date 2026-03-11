/**
 * Sessions Provider — Reads OpenClaw session transcripts
 * Category: ai
 *
 * Parses .jsonl files from ~/.openclaw/agents/main/sessions/
 * Each line is a JSON object with message data, token usage, etc.
 */

const fs = require('fs');
const path = require('path');

module.exports = {
  id: 'sessions',
  name: 'AI Sessions',
  icon: '🧠',
  category: 'ai',
  refreshInterval: 15000,

  async getData({ config }) {
    const sessionsDir = config.paths.sessions;
    const sessions = [];

    if (!fs.existsSync(sessionsDir)) {
      return { sessions, total: 0 };
    }

    try {
      const files = fs.readdirSync(sessionsDir)
        .filter((f) => f.endsWith('.jsonl'))
        .map((f) => ({
          name: f,
          path: path.join(sessionsDir, f),
          stat: fs.statSync(path.join(sessionsDir, f)),
        }))
        .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);

      for (const file of files) {
        try {
          const session = parseSession(file);
          if (session) sessions.push(session);
        } catch (e) {
          // Skip unparseable sessions
        }
      }
    } catch (e) {
      console.error('[Sessions] Error reading sessions:', e.message);
    }

    return {
      sessions,
      total: sessions.length,
      active: sessions.filter((s) => s.active).length,
      recent: sessions.filter((s) => !s.active && s.recentlyActive).length,
    };
  },
};

/**
 * Parse a session .jsonl file into a summary object
 */
function parseSession(file) {
  // Read first 8KB for quick parsing (enough for metadata)
  const fd = fs.openSync(file.path, 'r');
  const buffer = Buffer.alloc(8192);
  const bytesRead = fs.readSync(fd, buffer, 0, 8192, 0);
  fs.closeSync(fd);

  if (bytesRead === 0) return null;

  const content = buffer.toString('utf8', 0, bytesRead);
  const lines = content.split('\n').filter((l) => l.trim());

  let sessionKey = null;
  let sessionId = file.name.replace('.jsonl', '');
  let model = null;
  let totalInput = 0;
  let totalOutput = 0;
  let totalCost = 0;
  let messageCount = 0;
  let firstUserMessage = null;

  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      if (entry.type !== 'message' || !entry.message) continue;

      // Get session key from first entry
      if (!sessionKey && entry.key) sessionKey = entry.key;

      const msg = entry.message;
      messageCount++;

      // Extract model from assistant messages
      if (msg.role === 'assistant' && msg.model && !model) {
        model = msg.model.replace('anthropic/', '').replace('openai/', '');
      }

      // Aggregate token usage
      if (msg.usage) {
        totalInput += msg.usage.input || msg.usage.inputTokens || 0;
        totalOutput += msg.usage.output || msg.usage.outputTokens || 0;
        if (msg.usage.cost?.total) totalCost += msg.usage.cost.total;
      }

      // Get first user message for context
      if (msg.role === 'user' && !firstUserMessage) {
        let text = '';
        if (typeof msg.content === 'string') {
          text = msg.content;
        } else if (Array.isArray(msg.content)) {
          const textPart = msg.content.find((c) => c.type === 'text');
          if (textPart) text = textPart.text || '';
        }
        // Strip Slack metadata prefix
        firstUserMessage = text.replace(/^\[Slack[^\]]*\]\s*\w+\s*\([^)]+\):\s*/, '').slice(0, 120);
      }
    } catch (e) {
      // Skip malformed lines
    }
  }

  // Calculate age
  const ageMs = Date.now() - file.stat.mtimeMs;
  const minutesAgo = Math.round(ageMs / 60000);

  // Determine channel from key
  let channel = 'other';
  let label = sessionId.slice(0, 8);
  if (sessionKey) {
    if (sessionKey.includes('slack')) channel = 'slack';
    else if (sessionKey.includes('telegram')) channel = 'telegram';
    else if (sessionKey.includes('discord')) channel = 'discord';

    // Extract channel name hint from key
    if (sessionKey.includes(':thread:')) {
      label = `${channel} thread`;
    }
  }

  return {
    id: sessionId,
    key: sessionKey,
    label,
    channel,
    model: model || 'unknown',
    tokens: totalInput + totalOutput,
    inputTokens: totalInput,
    outputTokens: totalOutput,
    cost: totalCost,
    messageCount,
    preview: firstUserMessage,
    active: minutesAgo < 15,
    recentlyActive: minutesAgo < 60,
    minutesAgo,
    lastModified: file.stat.mtime.toISOString(),
  };
}

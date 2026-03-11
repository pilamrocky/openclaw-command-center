/**
 * Memory Provider — Reads OpenClaw memory/knowledge files
 * Category: knowledge
 *
 * Scans the workspace memory/ directory and MEMORY.md for agent knowledge.
 */

const fs = require('fs');
const path = require('path');

module.exports = {
  id: 'memory',
  name: 'Agent Memory',
  icon: '📝',
  category: 'knowledge',
  refreshInterval: 60000,

  async getData({ config }) {
    const memoryDir = config.paths.memory;
    const memoryFile = path.join(config.paths.workspace, 'MEMORY.md');

    const result = {
      files: [],
      totalFiles: 0,
      totalSize: 0,
      totalSizeFormatted: '0 B',
      longTermMemory: null,
      recentEntries: [],
    };

    // Read MEMORY.md (long-term memory)
    try {
      if (fs.existsSync(memoryFile)) {
        const stat = fs.statSync(memoryFile);
        const content = fs.readFileSync(memoryFile, 'utf8');
        result.longTermMemory = {
          size: stat.size,
          sizeFormatted: formatBytes(stat.size),
          lines: content.split('\n').length,
          preview: content.slice(0, 500),
        };
        result.totalSize += stat.size;
        result.totalFiles++;
      }
    } catch (e) {
      // Not available
    }

    // Scan memory/ directory
    try {
      if (fs.existsSync(memoryDir)) {
        const files = scanDir(memoryDir, memoryDir);
        files.sort((a, b) => b.modified - a.modified);

        result.files = files.slice(0, 10).map((f) => ({
          name: f.name,
          size: f.size,
          sizeFormatted: formatBytes(f.size),
          age: formatTimeAgo(f.modified),
          modified: f.modified.toISOString(),
        }));

        result.totalFiles += files.length;
        files.forEach((f) => (result.totalSize += f.size));

        // Read recent entries from today's log
        const today = new Date().toISOString().split('T')[0];
        const todayFile = path.join(memoryDir, `${today}.md`);
        if (fs.existsSync(todayFile)) {
          const content = fs.readFileSync(todayFile, 'utf8');
          result.recentEntries = content
            .split('\n')
            .filter((l) => l.startsWith('- '))
            .slice(-5)
            .map((l) => l.replace(/^- /, '').trim());
        }
      }
    } catch (e) {
      console.error('[Memory] Error scanning:', e.message);
    }

    result.totalSizeFormatted = formatBytes(result.totalSize);
    return result;
  },
};

function scanDir(dir, baseDir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...scanDir(fullPath, baseDir));
    } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.json'))) {
      const stat = fs.statSync(fullPath);
      files.push({
        name: path.relative(baseDir, fullPath),
        size: stat.size,
        modified: stat.mtime,
      });
    }
  }

  return files;
}

function formatBytes(bytes) {
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + ' GB';
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return bytes + ' B';
}

function formatTimeAgo(date) {
  const diffMs = Date.now() - date.getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
}

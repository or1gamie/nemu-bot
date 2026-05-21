const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '../data');

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getFile(guildId) {
  ensureDir();
  return path.join(DATA_DIR, `schedules-${guildId}.json`);
}

function load(guildId) {
  const file = getFile(guildId);
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function save(guildId, data) {
  fs.writeFileSync(getFile(guildId), JSON.stringify(data, null, 2));
}

function add(guildId, { name, timestamp }) {
  const schedules = load(guildId);

  const entry = {
    id: crypto.randomUUID(),
    name,
    timestamp,
    createdAt: Date.now(),
    reminded: {
        h72: false,
        h12: false,
        h1: false,
        m30: false,
        m5: false
    }
  };

  schedules.push(entry);
  save(guildId, schedules);
  return entry;
}

function getAll(guildId) {
  return load(guildId);
}

function update(guildId, schedules) {
  save(guildId, schedules);
}

function remove(guildId, index) {
  const schedules = load(guildId);

  if (index < 0 || index >= schedules.length) {
    return null;
  }

  const [removed] = schedules.splice(index, 1);
  save(guildId, schedules);

  return removed;
}

function getAllGuildSchedules() {
  ensureDir();
  const files = fs.readdirSync(DATA_DIR).filter(f => f.startsWith('schedules-'));
  return files.map(file => ({
    guildId: file.replace('schedules-', '').replace('.json', ''),
    schedules: JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'))
  }));
}

/** Remove schedules whose start time has passed. Returns how many were removed. */
function removeExpired(guildId, now = Math.floor(Date.now() / 1000)) {
  const schedules = load(guildId);
  const kept = schedules.filter(s => s.timestamp > now);
  if (kept.length === schedules.length) return 0;
  save(guildId, kept);
  return schedules.length - kept.length;
}

function pruneAllExpired(now = Math.floor(Date.now() / 1000)) {
  ensureDir();
  let removed = 0;
  for (const { guildId } of getAllGuildSchedules()) {
    removed += removeExpired(guildId, now);
  }
  return removed;
}

module.exports = {
  add,
  remove,
  getAll,
  update,
  getAllGuildSchedules,
  removeExpired,
  pruneAllExpired,
};

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '../data/user-timezones.json');

function load() {
  try {
    if (!fs.existsSync(FILE)) return {};
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    return {};
  }
}

function save(data) {
  const dir = path.dirname(FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

function get(userId) {
  return load()[userId] || null;
}

function set(userId, zone) {
  const data = load();
  data[userId] = zone;
  save(data);
}

module.exports = { get, set };

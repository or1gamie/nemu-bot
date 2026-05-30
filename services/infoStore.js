const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const FILE = path.join(DATA_DIR, 'information.json');

function load() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(FILE)) return { entries: {} };
  return JSON.parse(fs.readFileSync(FILE, 'utf8'));
}

function save(data) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

function get(num) {
  return load().entries[String(num)] || null;
}

function set(num, entry) {
  const data = load();
  data.entries[String(num)] = entry;
  save(data);
}

function getAll() {
  return load().entries;
}

module.exports = { get, set, getAll };

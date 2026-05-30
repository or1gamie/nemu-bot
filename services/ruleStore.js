const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const FILE = path.join(DATA_DIR, 'rules.json');

function load() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(FILE)) return { rules: {} };
  return JSON.parse(fs.readFileSync(FILE, 'utf8'));
}

function save(data) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

function get(ruleNum) {
  return load().rules[String(ruleNum)] || null;
}

function set(ruleNum, entry) {
  const data = load();
  data.rules[String(ruleNum)] = entry;
  save(data);
}

function getAll() {
  return load().rules;
}

module.exports = { get, set, getAll };

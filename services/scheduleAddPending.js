const pending = new Map();

module.exports = {
  set(userId, data) {
    pending.set(userId, data);
  },
  get(userId) {
    return pending.get(userId);
  },
  clear(userId) {
    pending.delete(userId);
  },
};

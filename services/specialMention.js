const LINES = {
  mention: [
    'Yes honey 💕',
    'Yes babe~',
    'Iya sayang',
    'Iya, ada apa?',
    'Hm? Iya sayang~',
    'Yes, I\'m here babe',
    'Apa sayang?',
    'Iya honey, kenapa?',
  ],
  sched_list: [
    'Ini sayang',
    'Ini ya sayang~',
    'Oke honey, ini jadwalnya',
    'Nih sayang, cek ya',
  ],
  sched_add: [
    'Udah aku catat sayang',
    'Oke sayang, sudah ditambah',
    'Siap honey, jadwalnya masuk',
  ],
  sched_delete: [
    'Sudah dihapus sayang',
    'Oke sayang, udah dihapus',
    'Done honey, yang itu hilang',
  ],
  sched_empty: [
    'Belum ada jadwal sayang',
    'Kosong nih sayang, belum ada schedule',
  ],
  announce_success: [
    'Sudah diumumkan sayang',
    'Oke honey, announcement-nya udah keluar',
  ],
  default: [
    'Iya sayang~',
    'Oke sayang',
  ],
};

function getSpecialUserId() {
  return process.env.SPECIAL_USER_ID?.trim() || null;
}

function isSpecialUser(userId) {
  const specialId = getSpecialUserId();
  return Boolean(specialId && userId === specialId);
}

function mentionsBot(message, client) {
  return message.mentions.has(client.user);
}

function pick(context = 'default') {
  const pool = LINES[context] || LINES.default;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Attach a contextual preface for the special user (text above embeds). */
function withSpecialContent(message, context, payload = {}) {
  if (!isSpecialUser(message.author.id)) return payload;

  const line = pick(context);
  return {
    ...payload,
    content: payload.content ? `${line}\n${payload.content}` : line,
  };
}

async function handleSpecialMention(message, client) {
  if (!isSpecialUser(message.author.id)) return;
  if (!mentionsBot(message, client)) return;
  if (message.content.startsWith('!')) return;

  await message.reply(pick('mention'));
}

module.exports = {
  handleSpecialMention,
  isSpecialUser,
  mentionsBot,
  withSpecialContent,
  pick,
};

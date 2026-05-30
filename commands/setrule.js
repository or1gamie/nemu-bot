const hasAdminRole = require('../utils/hasAdminRole');
const editSession = require('../services/editSession');
const ruleStore = require('../services/ruleStore');
const { buildRulePayload } = require('../utils/ruleEmbed');
const { withSpecialContent } = require('../services/specialMention');

module.exports = {
  name: 'setrule',

  async execute(message, args) {
    if (!hasAdminRole(message.member)) {
      return message.reply('You do not have permission to use this command.');
    }

    const ruleNum = parseInt(args[0], 10);
    if (!Number.isInteger(ruleNum) || ruleNum < 1) {
      return message.reply(
        'Usage: `!setrule <number>`\n' +
        'Contoh: `!setrule 1` lalu kirim isi rule di pesan berikutnya.\n\n' +
        'Format isi (satu pesan):\n' +
        '```\n' +
        'Judul Rule\n' +
        '\n' +
        'Isi rule (boleh multi-baris)\n' +
        '---\n' +
        'Teks opsional di bawah garis (lewati baris --- jika tidak perlu)\n' +
        '```'
      );
    }

    const channelId = process.env.RULE_CHANNEL_ID;
    if (!channelId) {
      return message.reply('RULE_CHANNEL_ID belum di-set di .env');
    }

    editSession.set(message.author.id, {
      handler: async (replyMsg) => {
        editSession.clear(replyMsg.author.id);
        await postRule(message, replyMsg, ruleNum, channelId);
      },
    });

    const existing = ruleStore.get(ruleNum);
    await message.reply(
      withSpecialContent(message, 'default', {
        content:
          `Rule **#${ruleNum}** — kirim isi rule sekarang (${existing ? 'akan **di-edit**' : 'akan **ditambah**'}).\n\n` +
          'Baris pertama = **judul**, kosongkan baris, lalu **isi**. Opsional: `---` lalu teks di bawah garis animasi.',
      })
    );
  },
};

async function postRule(cmdMessage, contentMessage, ruleNum, channelId) {
  const raw = contentMessage.content.trim();
  if (!raw) {
    return cmdMessage.reply('Isi rule kosong, dibatalkan.');
  }

  let title;
  let body;
  let footer = '';

  if (raw.includes('\n---\n')) {
    const [main, foot] = raw.split('\n---\n');
    footer = foot.trim();
    const lines = main.split('\n');
    title = lines[0].trim();
    body = lines.slice(1).join('\n').trim();
  } else {
    const lines = raw.split('\n');
    title = lines[0].trim();
    body = lines.slice(1).join('\n').trim();
  }

  if (!title || !body) {
    return cmdMessage.reply(
      'Format salah. Baris 1 = judul, baris kosong, lalu isi rule (min 1 baris isi).'
    );
  }

  const channel = await cmdMessage.client.channels.fetch(channelId).catch(() => null);
  if (!channel) {
    return cmdMessage.reply('Channel rule tidak ditemukan.');
  }

  const entry = { title, body, footer };
  const payload = await buildRulePayload(entry);
  const existing = ruleStore.get(ruleNum);

  let messageId;
  if (existing?.messageId) {
    try {
      const msg = await channel.messages.fetch(existing.messageId);
      await msg.edit(payload);
      messageId = msg.id;
    } catch {
      const msg = await channel.send(payload);
      messageId = msg.id;
    }
  } else {
    const msg = await channel.send(payload);
    messageId = msg.id;
  }

  ruleStore.set(ruleNum, { ...entry, messageId });

  await cmdMessage.reply(
    withSpecialContent(cmdMessage, 'default', {
      content: `Rule **#${ruleNum}** berhasil ${existing ? 'di-update' : 'ditambahkan'}.`,
    })
  );
}

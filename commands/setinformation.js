const hasAdminRole = require('../utils/hasAdminRole');
const editSession = require('../services/editSession');
const infoStore = require('../services/infoStore');
const { buildInfoPayload } = require('../utils/infoEmbed');
const { parseInfoContent } = require('../utils/parseInfoContent');
const { withSpecialContent } = require('../services/specialMention');

module.exports = {
  name: 'setinformation',

  async execute(message, args) {
    if (!hasAdminRole(message.member)) {
      return message.reply('You do not have permission to use this command.');
    }

    const num = parseInt(args[0], 10);
    if (!Number.isInteger(num) || num < 1) {
      return message.reply(
        'Usage: `!setinformation <number>`\n' +
        'Contoh: `!setinformation 1` lalu kirim isi di pesan berikutnya.\n\n' +
        '**Multi role** (satu embed, banyak role):\n' +
        '```\n' +
        'Judul Kategori\n' +
        '\n' +
        'ROLE_ID_1\n' +
        'Penjelasan role pertama...\n' +
        '\n' +
        'ROLE_ID_2\n' +
        'Penjelasan role kedua...\n' +
        '---\n' +
        'Teks opsional di bawah garis animasi\n' +
        '```'
      );
    }

    const channelId = process.env.INFORMATION_CHANNEL_ID;
    if (!channelId) {
      return message.reply('INFORMATION_CHANNEL_ID belum di-set di .env');
    }

    editSession.set(message.author.id, {
      handler: async (replyMsg) => {
        editSession.clear(replyMsg.author.id);
        await postInfo(message, replyMsg, num, channelId);
      },
    });

    const existing = infoStore.get(num);
    await message.reply(
      withSpecialContent(message, 'default', {
        content:
          `Info **#${num}** — kirim isi sekarang (${existing ? 'akan **di-edit**' : 'akan **ditambah**'}).\n\n` +
          'Bisa **banyak role**: ulangi blok `ROLE_ID` + penjelasan. Role ID boleh `<@&123...>`.',
      })
    );
  },
};

async function postInfo(cmdMessage, contentMessage, num, channelId) {
  const raw = contentMessage.content.trim();
  if (!raw) {
    return cmdMessage.reply('Isi kosong, dibatalkan.');
  }

  const parsed = parseInfoContent(raw);
  if (parsed.error) {
    return cmdMessage.reply(parsed.error);
  }

  const { title, roles, footer } = parsed;
  const guild = cmdMessage.guild;

  for (const r of roles) {
    const role = await guild.roles.fetch(r.roleId).catch(() => null);
    if (!role) {
      return cmdMessage.reply(`Role ID \`${r.roleId}\` tidak ditemukan di server.`);
    }
  }

  const channel = await cmdMessage.client.channels.fetch(channelId).catch(() => null);
  if (!channel) {
    return cmdMessage.reply('Channel information tidak ditemukan.');
  }

  const entry = { title, roles, footer };
  const payload = await buildInfoPayload(entry);
  const existing = infoStore.get(num);

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

  infoStore.set(num, { ...entry, messageId });

  const names = (
    await Promise.all(
      roles.map((r) => guild.roles.fetch(r.roleId).then((role) => role.name))
    )
  ).join(', ');

  await cmdMessage.reply(
    withSpecialContent(cmdMessage, 'default', {
      content: `Info **#${num}** (${roles.length} role: ${names}) berhasil ${existing ? 'di-update' : 'ditambahkan'}.`,
    })
  );
}

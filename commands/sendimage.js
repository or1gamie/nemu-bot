const hasAdminRole = require('../utils/hasAdminRole');
const editSession = require('../services/editSession');
const { extractImages } = require('../utils/extractImages');
const { withSpecialContent } = require('../services/specialMention');

module.exports = {
  name: 'sendimage',

  async execute(message, args) {
    if (!hasAdminRole(message.member)) {
      return message.reply('You do not have permission to use this command.');
    }

    const channelId = args[0]?.replace(/\D/g, '');
    if (!channelId) {
      return message.reply(
        'Usage: `!sendimage <channel_id>`\n' +
        'Lalu kirim **gambar** (upload / paste) atau **link gambar** di pesan berikutnya.\n\n' +
        'Bot akan forward ke channel tujuan (file di-upload ulang, bukan cuma teks URL).'
      );
    }

    const target = await message.client.channels.fetch(channelId).catch(() => null);
    if (!target?.isTextBased()) {
      return message.reply('Channel tidak ditemukan atau bukan text channel.');
    }

    const perms = target.permissionsFor(message.guild.members.me);
    if (!perms?.has(['ViewChannel', 'SendMessages', 'AttachFiles'])) {
      return message.reply('Bot tidak punya izin kirim gambar ke channel itu.');
    }

    editSession.set(message.author.id, {
      handler: async (replyMsg) => {
        editSession.clear(replyMsg.author.id);
        await forwardImage(message, replyMsg, target);
      },
    });

    await message.reply(
      withSpecialContent(message, 'default', {
        content:
          `Siap. Kirim gambar ke **#${target.name}** (\`${channelId}\`).\n` +
          'Upload file, paste image, atau kirim link `https://...png/jpg/gif/webp`',
      })
    );
  },
};

async function forwardImage(cmdMessage, imageMessage, target) {
  const { files, urls } = extractImages(imageMessage);

  if (!files.length && !urls.length) {
    return cmdMessage.reply(
      'Tidak ada gambar terdeteksi. Kirim ulang: `!sendimage <channel_id>` lalu upload / link gambar.'
    );
  }

  let sent = 0;
  const text = imageMessage.content?.trim();

  if (files.length) {
    await target.send({
      content: text || undefined,
      files: [...files.values()],
    });
    sent += files.length;
  }

  for (const url of urls) {
    if (files.some((f) => f.url === url)) continue;
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const type = res.headers.get('content-type') || '';
      if (!type.startsWith('image/')) continue;
      const ext = type.split('/')[1]?.split(';')[0] || 'png';
      const buf = Buffer.from(await res.arrayBuffer());
      await target.send({
        files: [{ attachment: buf, name: `image.${ext}` }],
      });
      sent++;
    } catch {
      await target.send({ content: url }).catch(() => null);
      sent++;
    }
  }

  await cmdMessage.reply(
    withSpecialContent(cmdMessage, 'default', {
      content: `Gambar terkirim ke <#${target.id}> (${sent} item).`,
    })
  );
}

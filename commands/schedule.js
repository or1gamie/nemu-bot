const hasAdminRole = require('../utils/hasAdminRole');
const store = require('../services/scheduleStore');
const userTimezoneStore = require('../services/userTimezoneStore');
const {
  parseScheduleInput,
  getTimezoneLabelForUser,
  needsTimezoneSetup,
  normalizeZoneInput,
  isValidZone,
  TZ_HELP_EXAMPLES,
} = require('../utils/parseScheduleDate');
const { sendScheduleAdded } = require('../utils/scheduleAdd');
const {
  buildTimezoneRequiredReply,
  stashPendingAdd,
} = require('../utils/timezoneGate');
const { tryCompletePendingAdd } = require('../utils/completePendingAdd');
const { withSpecialContent } = require('../services/specialMention');
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

module.exports = {
  name: 'sched',

  async execute(message, args) {
    store.removeExpired(message.guildId);

    const sub = args.shift()?.toLowerCase();

    if (!sub) {
      return message.reply(
        'Usage:\n' +
        '`!sched list`\n' +
        '`!sched add <name>, <DD/MM/YYYY HH:mm>` (admin)\n' +
        '`!sched delete <number>` (admin)\n' +
        '`!sched tz <+6|+7|Asia/Kuala_Lumpur|…>` — **wajib sekali** sebelum add/edit'
      );
    }

    const isAdmin = hasAdminRole(message.member);

    if (!isAdmin && sub !== 'list' && sub !== 'tz') {
      return message.reply('You do not have permission to use this command.');
    }

    if (sub === 'tz') return setUserTimezone(message, args);
    if (sub === 'add') return addSchedule(message, args);
    if (sub === 'list') return listSchedules(message);
    if (sub === 'delete') return deleteSchedule(message, args);

    return message.reply('Unknown subcommand.');
  }
};

async function setUserTimezone(message, args) {
  const input = args.join(' ').trim();
  if (!input) {
    return message.reply(
      `Timezone kamu sekarang: **${getTimezoneLabelForUser(message.author.id)}**\n` +
      `Ubah: ${TZ_HELP_EXAMPLES}`
    );
  }

  const zone = normalizeZoneInput(input);
  if (!isValidZone(zone)) {
    return message.reply(`Timezone tidak valid. Contoh: ${TZ_HELP_EXAMPLES}`);
  }

  userTimezoneStore.set(message.author.id, zone);

  const completed = await tryCompletePendingAdd(message.author, message.channel);
  if (completed?.ok) {
    return message.reply(completed.message);
  }
  if (completed && !completed.ok) {
    return message.reply(completed.message);
  }

  return message.reply(
    `Timezone kamu diset ke **${getTimezoneLabelForUser(message.author.id)}**.\n` +
    'Sekarang bisa `!sched add` — waktu yang diketik = jam di zona kamu.'
  );
}

async function addSchedule(message, args) {
  const content = args.join(' ').split(',');
  const name = content[0]?.trim();
  const dateString = content[1]?.trim();

  if (needsTimezoneSetup(message.author.id)) {
    const pending = stashPendingAdd(message.author.id, message.guildId, name, dateString);
    return message.reply(buildTimezoneRequiredReply(pending));
  }

  if (!name || !dateString) {
    return message.reply(
      'Usage: `!sched add <name>, <DD/MM/YYYY HH:mm>`\n' +
      'Opsional suffix: `..., 22/05/2026 00:59 +8` (override offset, timezone tetap harus sudah diset)'
    );
  }

  const parsed = parseScheduleInput(dateString, message.author.id);
  if (parsed.error === 'no_timezone') {
    const pending = stashPendingAdd(message.author.id, message.guildId, name, dateString);
    return message.reply(buildTimezoneRequiredReply(pending));
  }
  if (parsed.error === 'format') {
    return message.reply(
      `Invalid date format. Use \`DD/MM/YYYY HH:mm\` (${getTimezoneLabelForUser(message.author.id)}).`
    );
  }
  if (parsed.error === 'invalid') {
    return message.reply('❌ Invalid date.');
  }

  await sendScheduleAdded(message.channel, message.author, message.guildId, name, parsed.timestamp);
}

function listSchedules(message) {
  const schedules = store.getAll(message.guildId);

  if (schedules.length === 0) {
    return message.reply(
      withSpecialContent(message, 'sched_empty', { content: 'No schedules found.' })
    );
  }

  const isAdmin = hasAdminRole(message.member);

  const embed = new EmbedBuilder()
    .setTitle('Schedules')
    .setColor(0x2ecc71)
    .setDescription(
      'Click schedule name to see details.\n' +
      '_Waktu tampil menyesuaikan timezone Discord kamu._'
    );

  const rows = [];

  schedules.forEach((s, i) => {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`sched:detail:${i}`)
        .setLabel(`View ${s.name}`)
        .setStyle(ButtonStyle.Primary)
    );

    if (isAdmin) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`sched:edit:${i}`)
          .setLabel('Edit')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`sched:delete:${i}`)
          .setLabel('Delete')
          .setStyle(ButtonStyle.Danger)
      );
    }

    rows.push(row);
  });

  message.channel.send(
    withSpecialContent(message, 'sched_list', {
      embeds: [embed],
      components: rows.slice(0, 5),
    })
  );
}

function deleteSchedule(message, args) {
  const index = parseInt(args[0]) - 1;

  if (isNaN(index)) {
    return message.reply('Usage: `!sched delete <number>`');
  }

  const removed = store.remove(message.guildId, index);
  if (!removed) {
    return message.reply('Schedule not found.');
  }

  const embed = new EmbedBuilder()
    .setTitle('Schedule Deleted')
    .setColor(0xe74c3c)
    .setDescription(`**${removed.name}**\n<t:${removed.timestamp}:F>`);

  message.channel.send(
    withSpecialContent(message, 'sched_delete', { embeds: [embed] })
  );
}

const hasAdminRole = require('../utils/hasAdminRole');
const store = require('../services/scheduleStore');
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
        '`!sched delete <number>` (admin)'
        );
    }

    const isAdmin = hasAdminRole(message.member);

    if (!isAdmin && sub !== 'list') {
        return message.reply('You do not have permission to use this command.');
    }

    if (sub === 'add') return addSchedule(message, args);
    if (sub === 'list') return listSchedules(message);
    if (sub === 'delete') return deleteSchedule(message, args);

    return message.reply('Unknown subcommand.');
    }
};

function addSchedule(message, args) {
  const content = args.join(' ').split(',');
  const name = content[0]?.trim();
  const dateString = content[1]?.trim();

  if (!name || !dateString) {
    return message.reply(
      'Usage: `!sched add <name>, <DD/MM/YYYY HH:mm>`'
    );
  }

  const match = dateString.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/);
  if (!match) {
    return message.reply('Invalid date format.');
  }

  const [, d, m, y, h, min] = match;
  const date = new Date(`${y}-${m}-${d}T${h}:${min}:00`);
  if (isNaN(date)) return message.reply('❌ Invalid date.');

  const timestamp = Math.floor(date.getTime() / 1000);
  const entry = store.add(message.guildId, { name, timestamp });

  const embed = new EmbedBuilder()
    .setTitle('Schedule Added')
    .setColor(0x3498db)
    .setDescription(
      `**${entry.name}**\n<t:${entry.timestamp}:F>  <t:${entry.timestamp}:R>`
    );

  message.channel.send(
    withSpecialContent(message, 'sched_add', { embeds: [embed] })
  );
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
    .setDescription('Click schedule name to see details.');

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
    return message.reply(
      'Usage: `!sched delete <number>`'
    );
  }

  const removed = store.remove(message.guildId, index);
  if (!removed) {
    return message.reply('Schedule not found.');
  }

  const embed = new EmbedBuilder()
    .setTitle('Schedule Deleted')
    .setColor(0xe74c3c)
    .setDescription(
      `**${removed.name}**\n<t:${removed.timestamp}:F>`
    );

  message.channel.send(
    withSpecialContent(message, 'sched_delete', { embeds: [embed] })
  );
}

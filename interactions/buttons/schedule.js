const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags
} = require('discord.js');
const store = require('../../services/scheduleStore');
const editSession = require('../../services/editSession');
const userTimezoneStore = require('../../services/userTimezoneStore');
const {
  parseScheduleInput,
  getTimezoneLabelForUser,
  needsTimezoneSetup,
  zoneFromSettzButton,
  isValidZone,
} = require('../../utils/parseScheduleDate');
const { tryCompletePendingAdd } = require('../../utils/completePendingAdd');
const { buildTimezoneRequiredReply } = require('../../utils/timezoneGate');

function hasAdminRole(interaction) {
  const roleId = process.env.ADMIN_ROLE_ID;
  if (!roleId) return false;
  return interaction.member.roles.cache.has(roleId);
}

module.exports = async function handleScheduleButton(interaction) {
  const parts = interaction.customId.split(':');
  const action = parts[1];
  const isAdmin = hasAdminRole(interaction);

  if (action === 'settz') {
    const zone = zoneFromSettzButton(parts);
    if (!isValidZone(zone)) {
      return interaction.reply({
        content: 'Timezone tombol tidak valid. Pakai `!sched tz +6` atau `!sched tz Asia/Kuala_Lumpur`.',
        flags: MessageFlags.Ephemeral
      });
    }
    userTimezoneStore.set(interaction.user.id, zone);

    const completed = await tryCompletePendingAdd(interaction.user, interaction.channel);
    if (completed) {
      return interaction.reply({
        content: completed.message,
        flags: MessageFlags.Ephemeral
      });
    }

    return interaction.reply({
      content: `Timezone kamu: **${getTimezoneLabelForUser(interaction.user.id)}**`,
      flags: MessageFlags.Ephemeral
    });
  }

  const index = Number(parts[2]);

  if (action === 'detail') {
    const schedules = store.getAll(interaction.guildId);
    const sched = schedules[index];

    if (!sched) {
      return interaction.reply({
        content: 'Schedule not found.',
        flags: MessageFlags.Ephemeral
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('Schedule Detail')
      .setColor(0xf1c40f)
      .setDescription(
        `**${sched.name}**\n\n` +
        `<t:${sched.timestamp}:F>\n(<t:${sched.timestamp}:R>)`
      );

    return interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral
    });
  }

  if (action === 'edit') {
    if (!isAdmin) {
      return interaction.reply({
        content: 'You do not have permission to edit schedules.',
        flags: MessageFlags.Ephemeral
      });
    }

    if (needsTimezoneSetup(interaction.user.id)) {
      return interaction.reply({
        ...buildTimezoneRequiredReply(),
        flags: MessageFlags.Ephemeral
      });
    }

    const schedules = store.getAll(interaction.guildId);
    const sched = schedules[index];

    if (!sched) {
      return interaction.reply({
        content: 'Schedule not found.',
        flags: MessageFlags.Ephemeral
      });
    }

    editSession.set(interaction.user.id, {
      index,
      handler: async (message) => {

        if (message.content.toLowerCase() === '!cancel') {
          editSession.clear(message.author.id);
          await message.reply('Edit cancelled.');
          return;
        }

        const parts = message.content.split(',');
        if (parts.length < 2) {
          await message.reply('Format invalid.\nUse:\n`<name>, <DD/MM/YYYY HH:mm>`');
          return;
        }

        const name = parts[0].trim();
        const dateString = parts.slice(1).join(',').trim();

        if (needsTimezoneSetup(message.author.id)) {
          await message.reply(buildTimezoneRequiredReply());
          return;
        }

        const parsed = parseScheduleInput(dateString, message.author.id);

        if (parsed.error === 'no_timezone') {
          await message.reply(buildTimezoneRequiredReply());
          return;
        }

        if (parsed.error === 'format') {
          await message.reply(
            `Date format invalid. Use \`DD/MM/YYYY HH:mm\` (${getTimezoneLabelForUser(message.author.id)}).`
          );
          return;
        }

        if (parsed.error === 'invalid') {
          await message.reply('Invalid date.');
          return;
        }

        const session = editSession.get(message.author.id);
        if (!session) {
          await message.reply('Edit session expired.');
          return;
        }

        const schedules = store.getAll(message.guildId);
        const sched = schedules[session.index];

        if (!sched) {
          await message.reply('Schedule not found.');
          editSession.clear(message.author.id);
          return;
        }

        sched.name = name;
        sched.timestamp = parsed.timestamp;

        store.update(message.guildId, schedules);
        editSession.clear(message.author.id);

        await message.reply('Schedule updated.');
      }
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('sched:cancelEdit')
        .setLabel('Cancel Edit')
        .setStyle(ButtonStyle.Secondary)
    );

    return interaction.reply({
      content:
        '**Edit mode started**\n\n' +
        'Send message:\n' +
        '`<new name>, <DD/MM/YYYY HH:mm>`\n' +
        `_Jam = timezone kamu (${getTimezoneLabelForUser(interaction.user.id)})_`,
      components: [row],
      flags: MessageFlags.Ephemeral
    });
  }

  if (action === 'cancelEdit') {
    editSession.clear(interaction.user.id);

    return interaction.reply({
      content: 'Edit cancelled.',
      flags: MessageFlags.Ephemeral
    });
  }

  if (action === 'delete') {
    if (!isAdmin) {
      return interaction.reply({
        content: 'You do not have permission to delete schedules.',
        flags: MessageFlags.Ephemeral
      });
    }

    const schedules = store.getAll(interaction.guildId);
    const sched = schedules[index];

    if (!sched) {
      return interaction.reply({
        content: 'Schedule not found.',
        flags: MessageFlags.Ephemeral
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('Confirm Deletion')
      .setColor(0xe74c3c)
      .setDescription(`Are you sure you want to delete:\n\n**${sched.name}**`);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`sched:confirmDelete:${index}`)
        .setLabel('Yes, delete')
        .setStyle(ButtonStyle.Danger)
    );

    return interaction.reply({
      embeds: [embed],
      components: [row],
      flags: MessageFlags.Ephemeral
    });
  }

  if (action === 'confirmDelete') {
    if (!isAdmin) {
      return interaction.reply({
        content: 'You are not allowed to perform this action.',
        flags: MessageFlags.Ephemeral
      });
    }

    const schedules = store.getAll(interaction.guildId);
    const sched = schedules[index];

    if (!sched) {
      return interaction.reply({
        content: 'Schedule not found.',
        flags: MessageFlags.Ephemeral
      });
    }

    schedules.splice(index, 1);
    store.update(interaction.guildId, schedules);

    return interaction.update({
      content: `**${sched.name}** deleted.`,
      embeds: [],
      components: []
    });
  }
};
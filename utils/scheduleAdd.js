const { EmbedBuilder } = require('discord.js');
const store = require('../services/scheduleStore');
const { withSpecialContent } = require('../services/specialMention');
const { getTimezoneLabelForUser } = require('./parseScheduleDate');

function buildAddedEmbed(entry, userId) {
  return new EmbedBuilder()
    .setTitle('Schedule Added')
    .setColor(0x3498db)
    .setDescription(
      `**${entry.name}**\n<t:${entry.timestamp}:F>  <t:${entry.timestamp}:R>`
    )
    .setFooter({
      text: `Waktu input: ${getTimezoneLabelForUser(userId)} · tampilan Discord menyesuaikan timezone viewer`,
    });
}

async function sendScheduleAdded(channel, messageAuthor, guildId, name, timestamp) {
  const entry = store.add(guildId, { name, timestamp });
  const embed = buildAddedEmbed(entry, messageAuthor.id);

  const payload = withSpecialContent(
    { author: messageAuthor },
    'sched_add',
    { embeds: [embed] }
  );

  await channel.send(payload);
  return entry;
}

module.exports = { sendScheduleAdded, buildAddedEmbed };

const { EmbedBuilder } = require('discord.js');
const { withSpecialContent } = require('../services/specialMention');

module.exports = {
  name: 'announcemsg',
  prefix: '!announcemsg',

  async execute(message, args, client) {
    const announcement = args.join(' ');

    if (!announcement) {
      return message.reply({
        content: 'Please write an announcement message.'
      });
    }

    const channelId = process.env.ANNOUNCEMENT_CHANNEL_ID;
    const channel = client.channels.cache.get(channelId);

    if (!channel) {
      return message.reply({
        content: 'Announcement channel not found.'
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('Announcement')
      .setDescription(announcement)
      .setColor(0x5865F2)
      .setFooter({
        text: `Announced by ${message.author.tag}`
      })
      .setTimestamp();

    await channel.send({ embeds: [embed] });

    await message.reply(
      withSpecialContent(message, 'announce_success', {
        content: 'Announcement has been sent successfully.',
      })
    );
  }
};
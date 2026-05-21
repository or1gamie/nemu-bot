const { EmbedBuilder } = require('discord.js');
const store = require('./scheduleStore');

const REMINDERS = [
  { key: 'h72', seconds: 259200, label: '72 hours' },
  { key: 'h12', seconds: 43200, label: '12 hours' },
  { key: 'h1', seconds: 3600, label: '1 hour' },
  { key: 'm30', seconds: 1800, label: '30 minutes' },
  { key: 'm5', seconds: 300, label: '5 minutes' }
];

async function tick(client) {
  const now = Math.floor(Date.now() / 1000);
  const allGuilds = store.getAllGuildSchedules();

  for (const { guildId } of allGuilds) {
    try {
      await client.guilds.fetch(guildId);
    } catch {
      continue;
    }

    const channel = client.channels.cache.get(process.env.REMINDER_CHANNEL_ID);
    const schedules = store.getAll(guildId);
    let changed = false;

    for (const sched of schedules) {
      for (const r of REMINDERS) {
        const remindAt = sched.timestamp - r.seconds;

        if (
          !sched.reminded[r.key] &&
          now >= remindAt &&
          now < remindAt + 60
        ) {
          if (channel) {
            await channel.send({
              content: '@everyone',
              allowedMentions: { parse: ['everyone'] },
              embeds: [
                new EmbedBuilder()
                  .setTitle('Schedule Reminder')
                  .setColor(0xf1c40f)
                  .addFields({
                    name: `${sched.name}`,
                    value:
                      `Happening in **${r.label}**\n\n` +
                      `<t:${sched.timestamp}:F>\n(<t:${sched.timestamp}:R>)`,
                    inline: false
                  })
                  .setTimestamp()
              ]
            });
          }

          sched.reminded[r.key] = true;
          changed = true;
        }
      }
    }

    const kept = schedules.filter(s => s.timestamp > now);
    if (kept.length !== schedules.length) {
      changed = true;
    }

    if (changed) {
      store.update(guildId, kept);
    }
  }
}

module.exports = function startReminder(client) {
  tick(client).catch(err => console.error('Reminder tick error:', err));

  setInterval(() => {
    tick(client).catch(err => console.error('Reminder tick error:', err));
  }, 60 * 1000);
};

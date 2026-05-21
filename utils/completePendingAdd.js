const scheduleAddPending = require('../services/scheduleAddPending');
const { parseScheduleInput, getTimezoneLabelForUser } = require('./parseScheduleDate');
const { sendScheduleAdded } = require('./scheduleAdd');

async function tryCompletePendingAdd(user, channel) {
  const pending = scheduleAddPending.get(user.id);
  if (!pending) return null;

  scheduleAddPending.clear(user.id);

  const parsed = parseScheduleInput(pending.dateString, user.id);
  if (parsed.error === 'format') {
    return {
      ok: false,
      message: `Timezone OK (**${getTimezoneLabelForUser(user.id)}**), tapi format tanggal salah. Ulangi \`!sched add\`.`,
    };
  }
  if (parsed.error === 'invalid' || parsed.error === 'no_timezone') {
    return {
      ok: false,
      message: `Timezone OK, tapi tanggal tidak valid. Ulangi \`!sched add\`.`,
    };
  }

  await sendScheduleAdded(channel, user, pending.guildId, pending.name, parsed.timestamp);
  return {
    ok: true,
    message:
      `Timezone: **${getTimezoneLabelForUser(user.id)}** — **${pending.name}** ditambahkan.`,
    name: pending.name,
  };
}

module.exports = { tryCompletePendingAdd };

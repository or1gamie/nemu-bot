const scheduleAddPending = require('../services/scheduleAddPending');
const { buildTimezonePickerRows, TZ_HELP_EXAMPLES } = require('./parseScheduleDate');

function buildTimezoneRequiredReply(pending) {
  let content =
    '**Set timezone dulu** sebelum add/edit schedule.\n\n' +
    'Pilih zona waktu kamu (sekali saja), lalu ulangi command kalau perlu.\n' +
    `Atau ketik: \`!sched tz …\` — contoh: ${TZ_HELP_EXAMPLES}`;

  if (pending?.name && pending?.dateString) {
    content +=
      `\n\n_Schedule menunggu:_ **${pending.name}** — \`${pending.dateString}\`` +
      '\nSetelah timezone dipilih, schedule ini otomatis diproses.';
  }

  return {
    content,
    components: buildTimezonePickerRows(),
  };
}

function stashPendingAdd(userId, guildId, name, dateString) {
  if (!name || !dateString) return null;
  const pending = { guildId, name, dateString };
  scheduleAddPending.set(userId, pending);
  return pending;
}

module.exports = {
  buildTimezoneRequiredReply,
  stashPendingAdd,
};

const { DateTime } = require('luxon');
const userTimezoneStore = require('../services/userTimezoneStore');

const DEFAULT_TIMEZONE = 'Asia/Jakarta';

const DATE_PATTERN =
  /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})(?:\s+(?:UTC|GMT)?([+-]\d{1,2}))?$/i;

/** Nama umum → IANA (case-insensitive) */
const ZONE_ALIASES = {
  'kuala lumpur': 'Asia/Kuala_Lumpur',
  kualalumpur: 'Asia/Kuala_Lumpur',
  kl: 'Asia/Kuala_Lumpur',
  malaysia: 'Asia/Kuala_Lumpur',
  singapore: 'Asia/Singapore',
  sg: 'Asia/Singapore',
  jakarta: 'Asia/Jakarta',
  wib: 'Asia/Jakarta',
  indonesia: 'Asia/Jakarta',
  bangkok: 'Asia/Bangkok',
  thailand: 'Asia/Bangkok',
  vietnam: 'Asia/Ho_Chi_Minh',
  'ho chi minh': 'Asia/Ho_Chi_Minh',
  manila: 'Asia/Manila',
  philippines: 'Asia/Manila',
  makassar: 'Asia/Makassar',
  wita: 'Asia/Makassar',
  japan: 'Asia/Tokyo',
  korea: 'Asia/Seoul',
  seoul: 'Asia/Seoul',
  taipei: 'Asia/Taipei',
  'hong kong': 'Asia/Hong_Kong',
};

function getDefaultTimezone() {
  return process.env.SCHEDULE_TIMEZONE?.trim() || DEFAULT_TIMEZONE;
}

function normalizeZoneInput(input) {
  const raw = input.trim();
  const lower = raw.toLowerCase();
  const compact = lower.replace(/\s+/g, '');

  if (ZONE_ALIASES[lower]) return ZONE_ALIASES[lower];
  if (ZONE_ALIASES[compact]) return ZONE_ALIASES[compact];

  const offsetExplicit = raw.match(/^([+-])(\d{1,2})$/);
  if (offsetExplicit) {
    return `UTC${offsetExplicit[1]}${offsetExplicit[2]}`;
  }

  const offsetSigned = raw.match(/^([+-]?\d{1,2})$/);
  if (offsetSigned) {
    const hours = Number(offsetSigned[1]);
    const sign = hours >= 0 ? '+' : '';
    return `UTC${sign}${hours}`;
  }

  if (raw.includes('/')) return raw;

  return raw;
}

/** Parse customId `sched:settz:…` (offset angka atau `iana:Asia.Kuala_Lumpur`) */
function zoneFromSettzButton(parts) {
  if (parts[2] === 'iana') {
    return parts[3].replace(/\./g, '/');
  }
  return `UTC+${parts[2]}`;
}

function isValidZone(zone) {
  return DateTime.now().setZone(zone).isValid;
}

function resolveZoneForUser(userId, inlineOffset) {
  const stored = userTimezoneStore.get(userId);
  if (!stored) return null;

  if (inlineOffset !== undefined && inlineOffset !== null) {
    const sign = Number(inlineOffset) >= 0 ? '+' : '';
    return `UTC${sign}${Number(inlineOffset)}`;
  }

  return stored;
}

function getTimezoneLabelForUser(userId) {
  const zone = userTimezoneStore.get(userId);
  if (!zone) return 'belum diset';

  const now = DateTime.now().setZone(zone);
  return now.isValid ? now.offsetNameShort || zone : zone;
}

function needsTimezoneSetup(userId) {
  return !userTimezoneStore.get(userId);
}

/**
 * Parse DD/MM/YYYY HH:mm [+offset] in the author's timezone.
 * Optional suffix +7 / +8 overrides stored zone for this command only.
 */
function parseScheduleInput(dateString, userId) {
  const match = dateString.trim().match(DATE_PATTERN);
  if (!match) return { error: 'format' };

  const [, d, m, y, h, min, inlineOffset] = match;
  const zone = resolveZoneForUser(userId, inlineOffset);
  if (!zone) return { error: 'no_timezone' };

  if (!isValidZone(zone)) return { error: 'invalid' };

  const dt = DateTime.fromObject(
    {
      year: Number(y),
      month: Number(m),
      day: Number(d),
      hour: Number(h),
      minute: Number(min),
      second: 0,
    },
    { zone }
  );

  if (!dt.isValid) return { error: 'invalid' };

  return {
    timestamp: Math.floor(dt.toSeconds()),
    zone,
    zoneLabel: dt.offsetNameShort || zone,
  };
}

function buildTimezonePickerRows() {
  const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
  const options = [
    { label: 'GMT+6', value: '6' },
    { label: 'GMT+7', value: '7' },
    { label: 'GMT+8', value: '8' },
    { label: 'GMT+9', value: '9' },
    { label: 'Malaysia (KL)', value: 'iana:Asia.Kuala_Lumpur' },
  ];

  const row = new ActionRowBuilder().addComponents(
    options.map(o =>
      new ButtonBuilder()
        .setCustomId(`sched:settz:${o.value}`)
        .setLabel(o.label)
        .setStyle(ButtonStyle.Primary)
    )
  );

  return [row];
}

const TZ_HELP_EXAMPLES =
  '`+6` · `+7` · `+8` · `+10` · `Asia/Kuala_Lumpur` · `kuala lumpur` · `malaysia` · `Asia/Singapore`';

module.exports = {
  getDefaultTimezone,
  normalizeZoneInput,
  isValidZone,
  zoneFromSettzButton,
  resolveZoneForUser,
  getTimezoneLabelForUser,
  needsTimezoneSetup,
  parseScheduleInput,
  buildTimezonePickerRows,
  TZ_HELP_EXAMPLES,
};

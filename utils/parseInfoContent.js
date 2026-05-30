const SNOWFLAKE = /^\d{17,20}$/;

function parseRoleIdLine(line) {
  const trimmed = line.trim();
  const mention = trimmed.match(/^<@&(\d{17,20})>$/);
  if (mention) return mention[1];
  if (SNOWFLAKE.test(trimmed)) return trimmed;
  const digits = trimmed.replace(/\D/g, '');
  if (SNOWFLAKE.test(digits) && digits === trimmed.replace(/\s/g, '')) return digits;
  return null;
}

/**
 * Format:
 * Judul
 *
 * ROLE_ID
 * Penjelasan role...
 *
 * ROLE_ID_2
 * Penjelasan...
 *
 * ---
 * Footer opsional
 */
function parseInfoContent(raw) {
  const splitFooter = raw.includes('\n---\n') ? raw.split('\n---\n') : [raw];
  const footer = splitFooter[1]?.trim() || '';
  const lines = splitFooter[0].split('\n');

  const title = lines[0]?.trim();
  if (!title) return { error: 'Judul (baris 1) wajib diisi.' };

  const roles = [];
  let i = 1;

  while (i < lines.length) {
    while (i < lines.length && !lines[i].trim()) i++;
    if (i >= lines.length) break;

    const roleId = parseRoleIdLine(lines[i]);
    if (!roleId) {
      return {
        error:
          `Baris ${i + 1} bukan Role ID valid.\n` +
          'Setiap role: baris ID (atau `<@&123...>`), lalu baris penjelasan di bawahnya.',
      };
    }
    i++;

    const descLines = [];
    while (i < lines.length) {
      if (!lines[i].trim()) {
        i++;
        continue;
      }
      const nextRole = parseRoleIdLine(lines[i]);
      if (nextRole && lines[i].trim() === nextRole) break;
      descLines.push(lines[i]);
      i++;
    }

    const description = descLines.join('\n').trim();
    if (!description) {
      return { error: `Role \`${roleId}\` belum ada penjelasannya.` };
    }
    roles.push({ roleId, description });
  }

  if (!roles.length) {
    return {
      error:
        'Minimal 1 role.\n' +
        'Setelah judul, kosongkan baris, lalu ROLE_ID + penjelasan (bisa banyak role).',
    };
  }

  return { title, roles, footer };
}

module.exports = { parseInfoContent };

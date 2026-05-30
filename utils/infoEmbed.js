const { EmbedBuilder } = require('discord.js');
const { BAR_NAME, getBarAttachment } = require('./animatedBarGif');
const { buildText } = require('./ruleEmbed');

const EMBED_COLOR = 0x7c4dff;
const MAX_DESC = 4096;
const MAX_FIELD_VALUE = 1024;

function normalizeRoles(entry) {
  if (entry.roles?.length) return entry.roles;
  if (entry.roleId) {
    return [{ roleId: entry.roleId, description: entry.body || '' }];
  }
  return [];
}

function buildRolesBlock(roles) {
  return roles.map((r) => `<@&${r.roleId}>\n${r.description}`).join('\n\n');
}

function buildRoleFields(roles) {
  return roles.map((r) => ({
    name: '\u200b',
    value: `<@&${r.roleId}>\n${r.description}`.slice(0, MAX_FIELD_VALUE),
    inline: false,
  }));
}

function buildInfoEmbed(entry, roles = normalizeRoles(entry)) {
  const embed = new EmbedBuilder()
    .setColor(EMBED_COLOR)
    .setTitle(entry.title)
    .setImage(`attachment://${BAR_NAME}`);

  const rolesBlock = buildRolesBlock(roles);
  const asDescription = buildText({ body: rolesBlock, footer: entry.footer });

  if (asDescription.length <= MAX_DESC) {
    embed.setDescription(asDescription);
    return embed;
  }

  embed.setDescription(entry.footer?.trim()?.slice(0, MAX_DESC) || '\u200b');
  const fields = buildRoleFields(roles);
  embed.addFields(fields.length <= 25 ? fields : fields.slice(0, 25));

  return embed;
}

async function buildInfoPayload(entry) {
  const roles = normalizeRoles(entry);
  return {
    embeds: [buildInfoEmbed(entry, roles)],
    files: [await getBarAttachment()],
    allowedMentions: { roles: roles.map((r) => r.roleId) },
  };
}

module.exports = { buildInfoEmbed, buildInfoPayload, normalizeRoles };

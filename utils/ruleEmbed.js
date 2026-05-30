const { EmbedBuilder } = require('discord.js');
const { BAR_NAME, getBarAttachment } = require('./animatedBarGif');

const EMBED_COLOR = 0x7c4dff;

function buildText({ body, footer }) {
  const parts = [body.trim()];
  if (footer?.trim()) parts.push(footer.trim());
  return parts.join('\n\n');
}

function buildRuleEmbed(entry) {
  return new EmbedBuilder()
    .setColor(EMBED_COLOR)
    .setTitle(entry.title)
    .setDescription(buildText(entry))
    .setImage(`attachment://${BAR_NAME}`);
}

async function buildRulePayload(entry) {
  return {
    embeds: [buildRuleEmbed(entry)],
    files: [await getBarAttachment()],
  };
}

module.exports = { buildRuleEmbed, buildRulePayload, buildText };

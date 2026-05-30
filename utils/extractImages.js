const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp)(\?.*)?$/i;

function isImageAttachment(att) {
  if (att.contentType?.startsWith('image/')) return true;
  return IMAGE_EXT.test(att.name || att.url || '');
}

function urlsFromText(text) {
  const urls = [];
  const re = /https?:\/\/[^\s<>]+/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    const url = m[0].replace(/[)>]+$/, '');
    if (IMAGE_EXT.test(url) || url.includes('cdn.discordapp.com') || url.includes('media.discordapp.net')) {
      urls.push(url);
    }
  }
  return urls;
}

function extractImages(message) {
  const files = [...message.attachments.values()].filter(isImageAttachment);
  const urls = new Set();

  for (const embed of message.embeds) {
    if (embed.image?.url) urls.add(embed.image.url);
    if (embed.thumbnail?.url && embed.thumbnail.url !== embed.image?.url) {
      urls.add(embed.thumbnail.url);
    }
  }

  for (const url of urlsFromText(message.content)) {
    urls.add(url);
  }

  return { files, urls: [...urls] };
}

module.exports = { extractImages, isImageAttachment };

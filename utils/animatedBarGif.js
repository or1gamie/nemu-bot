const { GIFEncoder, quantize, applyPalette } = require('gifenc');

const W = 420;
const H = 2;
const FRAMES = 48;
const FRAME_DELAY = 5; // centiseconds → 50ms ≈ 20fps
const BAR_NAME = 'rule-bar.gif';
const CACHE_VERSION = 3;

const DARK = { r: 15, g: 15, b: 20 };
const ACCENT = { r: 153, g: 0, b: 51 };

let cached = null;
let cacheKey = null;

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smoothstep(t) {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

function renderFrame(scroll) {
  const rgba = new Uint8Array(W * H * 4);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const u = x / W;

      // Gradasi lebar, scroll halus (bukan lompatan frame kasar)
      const wave = Math.sin((u + scroll) * Math.PI * 2) * 0.5 + 0.5;
      const mix = lerp(0.32, 0.68, smoothstep(wave));

      rgba[i] = Math.round(lerp(DARK.r, ACCENT.r, mix));
      rgba[i + 1] = Math.round(lerp(DARK.g, ACCENT.g, mix));
      rgba[i + 2] = Math.round(lerp(DARK.b, ACCENT.b, mix));

      const edge = Math.min(u / 0.14, (1 - u) / 0.14, 1);
      rgba[i + 3] = Math.round(255 * smoothstep(edge));
    }
  }

  return rgba;
}

function buildAnimatedBarGif() {
  const frames = [];
  for (let f = 0; f < FRAMES; f++) {
    const scroll = f / FRAMES;
    frames.push(renderFrame(scroll));
  }

  // Satu palet untuk semua frame → hindari kedip / "ngeframe" warna
  const sample = new Uint8Array(W * H * FRAMES * 4);
  for (let f = 0; f < FRAMES; f++) {
    sample.set(frames[f], f * W * H * 4);
  }
  const palette = quantize(sample, 128);

  const gif = GIFEncoder();
  for (const rgba of frames) {
    const index = applyPalette(rgba, palette);
    gif.writeFrame(index, W, H, { palette, delay: FRAME_DELAY });
  }

  gif.finish();
  return Buffer.from(gif.bytes());
}

async function getBarAttachment() {
  const key = CACHE_VERSION;
  if (!cached || cacheKey !== key) {
    cached = buildAnimatedBarGif();
    cacheKey = key;
  }
  return { attachment: cached, name: BAR_NAME };
}

module.exports = { BAR_NAME, getBarAttachment };

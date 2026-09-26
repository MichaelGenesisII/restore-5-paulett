/**
 * The supplied dove JPEGs are navy line art on a black field, which reads as a
 * black square anywhere on the cream page. This lifts the drawing off its
 * background: brightness becomes alpha, and every surviving pixel is repainted
 * in PVN navy so the doves match the palette exactly.
 *
 *   node scripts/make-doves.mjs
 */

import sharp from "sharp";

const NAVY = { r: 0x0c, g: 0x1b, b: 0x33 };

/** Below this the pixel is background; above it the stroke is fully opaque. */
const FLOOR = 6;
const CEIL = 42;

async function lift(source, destination) {
  const { data, info } = await sharp(source)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const out = Buffer.alloc(info.width * info.height * 4);

  for (let i = 0; i < info.width * info.height; i += 1) {
    const p = i * info.channels;
    const brightness = Math.max(data[p], data[p + 1], data[p + 2]);

    const t = (brightness - FLOOR) / (CEIL - FLOOR);
    const alpha = Math.round(Math.min(1, Math.max(0, t)) * 255);

    const q = i * 4;
    out[q] = NAVY.r;
    out[q + 1] = NAVY.g;
    out[q + 2] = NAVY.b;
    out[q + 3] = alpha;
  }

  await sharp(out, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png({ compressionLevel: 9 })
    .toFile(destination);

  console.log(`${destination} <- ${source} (${info.width}x${info.height})`);
}

await lift("public/left.jpg", "public/dove-left.png");
await lift("public/right.jpg", "public/dove-right.png");

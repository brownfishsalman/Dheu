// Builds all logo assets from the two Canva exports (same artwork on navy and
// on white). Comparing the two lets us recover exact transparency for the pin.
//   node scripts/build-logo.mjs
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const SRC_DARK = "brand-source/logo-on-navy.png";
const SRC_LIGHT = "brand-source/logo-on-white.png";
const NAVY = { r: 0, g: 39, b: 61 }; // logo background colour

const dark = await sharp(SRC_DARK).raw().toBuffer({ resolveWithObject: true });
const light = await sharp(SRC_LIGHT).raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: CH } = dark.info;

// Pin region (measured) with a little padding
const box = { left: 712, top: 485, width: 550, height: 741 };

// Two-background matting: L = a*C + (1-a)*255, D = a*C + (1-a)*bg
const out = Buffer.alloc(box.width * box.height * 4);
for (let y = 0; y < box.height; y++) {
  for (let x = 0; x < box.width; x++) {
    const si = ((box.top + y) * W + (box.left + x)) * CH;
    const oi = (y * box.width + x) * 4;
    const Lr = light.data[si], Dr = dark.data[si];
    // red channel has the largest background contrast (255 vs 0)
    let a = 1 - (Lr - Dr) / 255;
    a = Math.min(1, Math.max(0, a));
    if (a < 0.01) { out[oi + 3] = 0; continue; }
    for (let c = 0; c < 3; c++) {
      const L = light.data[si + c];
      const col = (L - (1 - a) * 255) / a;
      out[oi + c] = Math.round(Math.min(255, Math.max(0, col)));
    }
    out[oi + 3] = Math.round(a * 255);
  }
}

const mark = sharp(out, { raw: { width: box.width, height: box.height, channels: 4 } }).png();
const markBuf = await mark.toBuffer();
const trimmed = await sharp(markBuf).trim().png().toBuffer();
const meta = await sharp(trimmed).metadata();
console.log("mark:", meta.width, "x", meta.height);

mkdirSync("public/brand", { recursive: true });
mkdirSync("public/icons", { recursive: true });

// Transparent mark at full resolution + a small one for the header
await sharp(trimmed).png({ compressionLevel: 9 }).toFile("public/brand/mark.png");
await sharp(trimmed).resize({ height: 128 }).png().toFile("public/brand/mark-128.png");

// Square icon on navy: pin centred at ~62% of the tile (inside the maskable safe zone)
async function tile(size, file, { transparent = false, scale = 0.62 } = {}) {
  const pin = await sharp(trimmed).resize({ height: Math.round(size * scale) }).png().toBuffer();
  const pm = await sharp(pin).metadata();
  await sharp({
    create: { width: size, height: size, channels: 4, background: transparent ? { r: 0, g: 0, b: 0, alpha: 0 } : { ...NAVY, alpha: 1 } },
  })
    .composite([{ input: pin, left: Math.round((size - pm.width) / 2), top: Math.round((size - pm.height) / 2) }])
    .png()
    .toFile(file);
}

await tile(512, "public/icons/icon-512.png");
await tile(192, "public/icons/icon-192.png");
await tile(180, "src/app/apple-icon.png");
await tile(256, "src/app/icon.png", { transparent: true, scale: 0.94 }); // favicon: just the pin
await tile(1024, "public/brand/tile-1024.png", { scale: 0.6 }); // handy for app stores / social

// Full lockup (mark + DHEU) with transparent background, for the login screen
const lock = { left: 640, top: 470, width: 720, height: 1010 };
const lockOut = Buffer.alloc(lock.width * lock.height * 4);
for (let y = 0; y < lock.height; y++) {
  for (let x = 0; x < lock.width; x++) {
    const si = ((lock.top + y) * W + (lock.left + x)) * CH;
    const oi = (y * lock.width + x) * 4;
    // Wordmark differs between the two files (cream vs navy), so key the dark file only.
    const r = dark.data[si], g = dark.data[si + 1], b = dark.data[si + 2];
    const isBg = Math.abs(r - NAVY.r) < 3 && Math.abs(g - NAVY.g) < 3 && Math.abs(b - NAVY.b) < 3;
    lockOut[oi] = r; lockOut[oi + 1] = g; lockOut[oi + 2] = b; lockOut[oi + 3] = isBg ? 0 : 255;
  }
}
await sharp(lockOut, { raw: { width: lock.width, height: lock.height, channels: 4 } }).trim().png().toFile("public/brand/lockup-dark.png");
console.log("done");

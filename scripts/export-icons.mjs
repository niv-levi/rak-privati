/** Renders PWA / favicon PNGs from public/brand/symbol.svg using sharp. */
import fs from "node:fs";
import sharp from "sharp";
const svg = fs.readFileSync("public/brand/symbol.svg");
const out = [
  ["public/icons/icon-192.png", 192, false],
  ["public/icons/icon-512.png", 512, false],
  ["public/icons/icon-maskable-512.png", 512, true],
  ["public/icons/apple-touch-icon.png", 180, true],
  ["src/app/icon.png", 64, false],
  ["src/app/apple-icon.png", 180, true],
];
for (const [file, size, maskable] of out) {
  // maskable: symbol inside safe zone with brand background
  if (maskable) {
    const inner = Math.round(size * 0.66);
    const icon = await sharp(svg).resize(inner, inner).png().toBuffer();
    await sharp({ create: { width: size, height: size, channels: 4, background: "#16454A" } })
      .composite([{ input: icon, gravity: "center" }])
      .png()
      .toFile(file);
  } else {
    await sharp(svg).resize(size, size).png().toFile(file);
  }
  console.log("wrote", file);
}

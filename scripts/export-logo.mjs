/**
 * Generates the Rak Privati logo family as standalone SVG files in public/brand.
 * The Hebrew wordmark is converted to outlines (Heebo Bold) so the SVGs render
 * identically everywhere without depending on installed fonts.
 *
 * Usage: node scripts/export-logo.mjs [path/to/Heebo-Bold.ttf]
 * The TTF is only needed at generation time and is not committed.
 */
import fs from "node:fs";
import path from "node:path";
import opentype from "opentype.js";

const fontPath = process.argv[2] ?? process.env.HEEBO_BOLD_TTF;
if (!fontPath || !fs.existsSync(fontPath)) {
  console.error("Heebo Bold TTF path required (arg or HEEBO_BOLD_TTF).");
  process.exit(1);
}
const font = opentype.parse(fs.readFileSync(fontPath).buffer.slice(fs.readFileSync(fontPath).byteOffset, fs.readFileSync(fontPath).byteOffset + fs.readFileSync(fontPath).byteLength));
const outDir = path.resolve("public/brand");
fs.mkdirSync(outDir, { recursive: true });

const TEAL = "#16454A";
const DARK = "#18383B";
const WHITE = "#FFFFFF";
const AMBER = "#C48A45";

/**
 * Symbol: a rounded badge holding a road that bends into a check mark.
 * ViewBox 64x64. `mono` renders everything in a single color.
 */
function symbol({ bg = TEAL, fg = WHITE, accent = AMBER, mono = false, badge = true } = {}) {
  const fgc = mono ? fg : fg;
  const acc = mono ? fg : accent;
  return `
  <g>
    ${badge ? `<rect x="0" y="0" width="64" height="64" rx="16" fill="${bg}"/>` : ""}
    <!-- road / check: short curved arm then long arm -->
    <path d="M15 35.5 C21 35.5 25.5 41 29 46.5 L48 17" fill="none" stroke="${fgc}" stroke-width="8.5" stroke-linecap="round" stroke-linejoin="round"/>
    <!-- road centre markings on the long arm -->
    <path d="M33.5 40 L37 34.5 M40 29.5 L43.5 24" fill="none" stroke="${badge ? bg : fg}" stroke-width="2" stroke-linecap="round" opacity="${badge ? 1 : 0}"/>
    <!-- amber waypoint: the destination -->
    <circle cx="50.5" cy="13.5" r="3.6" fill="${acc}"/>
  </g>`;
}

function wordmarkPath(text, size, x, y, color) {
  // RTL text: opentype renders glyphs in logical order; Hebrew glyph advance is LTR in
  // glyph space so we reverse the string to get visual order.
  const visual = Array.from(text).reverse().join("");
  const p = font.getPath(visual, x, y, size, { kerning: true });
  const bb = p.getBoundingBox();
  return { d: p.toPathData(2), bb };
}

function horizontal({ bg, fg, text, mono = false, name }) {
  const size = 34;
  const { d, bb } = wordmarkPath("רק פרטי", size, 0, 0, text);
  const textW = bb.x2 - bb.x1;
  const gap = 14;
  const symbolSize = 48;
  const totalW = symbolSize + gap + textW + 4;
  const height = 56;
  // Symbol on the right (RTL start), text to its left.
  const symX = totalW - symbolSize;
  const textX = -bb.x1 + 2;
  const textY = height / 2 + (bb.y2 - bb.y1) / 2 - bb.y2 - 1;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW.toFixed(1)} ${height}" width="${totalW.toFixed(0)}" height="${height}" role="img" aria-labelledby="t">
  <title id="t">רק פרטי</title>
  <g transform="translate(${symX} 4) scale(${symbolSize / 64})">${symbol({ bg, fg: fg, mono, accent: mono ? fg : AMBER })}</g>
  <path transform="translate(${textX} ${textY})" d="${d}" fill="${text}"/>
</svg>`;
  fs.writeFileSync(path.join(outDir, name), svg.trim() + "\n");
}

function standalone({ bg, fg, mono, name, badge = true, accent }) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" role="img" aria-label="רק פרטי">
${symbol({ bg, fg, mono, badge, accent })}
</svg>`;
  fs.writeFileSync(path.join(outDir, name), svg.trim() + "\n");
}

// 1. Primary horizontal — light background
horizontal({ bg: TEAL, fg: WHITE, text: DARK, name: "logo-horizontal.svg" });
// 2. Horizontal — dark background
horizontal({ bg: WHITE, fg: TEAL, text: WHITE, name: "logo-horizontal-dark-bg.svg" });
// 3. Horizontal — monochrome
horizontal({ bg: DARK, fg: WHITE, text: DARK, mono: true, name: "logo-horizontal-mono.svg" });
// 4. Standalone symbol
standalone({ bg: TEAL, fg: WHITE, name: "symbol.svg" });
// 5. Symbol — dark background version (white badge, teal mark)
standalone({ bg: WHITE, fg: TEAL, name: "symbol-dark-bg.svg" });
// 6. Monochrome symbol
standalone({ bg: DARK, fg: WHITE, mono: true, name: "symbol-mono.svg" });
// 7. Favicon (symbol without fine markings reads better small — same geometry)
standalone({ bg: TEAL, fg: WHITE, name: "favicon.svg" });

console.log("Logo SVGs written to", outDir);

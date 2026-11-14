import "server-only";
import sharp from "sharp";
import { createHash } from "node:crypto";

export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
export const ALLOWED_INPUT_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "image/avif"]);
const MAX_EDGE = 1920;

export type ProcessedImage = { buffer: Buffer; width: number; height: number; bytes: number; mime: "image/webp"; contentHash: string; perceptualHash: string };

/** Magic-byte sniffing — never trust the client-provided MIME type. */
export function sniffImageType(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  const brand = buf.toString("ascii", 4, 12);
  if (brand.startsWith("ftyp")) {
    const b = brand.slice(4);
    if (["heic", "heix", "hevc", "mif1", "msf1"].includes(b)) return "image/heic";
    if (["avif", "avis"].includes(b)) return "image/avif";
  }
  return null;
}

/**
 * Normalizes an upload: auto-orients, strips ALL metadata (EXIF/GPS), resizes, re-encodes as WebP,
 * and computes exact + perceptual hashes for duplicate detection.
 */
export async function processImage(input: Buffer, opts: { rotate?: number; crop?: { x: number; y: number; w: number; h: number } } = {}): Promise<ProcessedImage> {
  // Pass 1: EXIF auto-orient + user rotation, metadata stripped (no withMetadata()).
  const rotation = (((opts.rotate ?? 0) % 360) + 360) % 360;
  let pipeline = sharp(input, { failOn: "error", limitInputPixels: 50_000_000 }).rotate();
  if (rotation) pipeline = pipeline.rotate(rotation);
  const oriented = await pipeline.toBuffer({ resolveWithObject: true });
  const w = oriented.info.width, h = oriented.info.height;
  if (!w || !h) throw new Error("INVALID_IMAGE");
  // Pass 2: crop (fractions relative to the rotated image the user previewed), resize, encode.
  let out = sharp(oriented.data, { failOn: "error" });
  if (opts.crop) {
    const left = Math.max(0, Math.min(w - 1, Math.round(opts.crop.x * w)));
    const top = Math.max(0, Math.min(h - 1, Math.round(opts.crop.y * h)));
    const width = Math.max(50, Math.min(w - left, Math.round(opts.crop.w * w)));
    const height = Math.max(50, Math.min(h - top, Math.round(opts.crop.h * h)));
    out = out.extract({ left, top, width, height });
  }
  const result = await out.resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true }).webp({ quality: 82, effort: 4 }).toBuffer({ resolveWithObject: true });
  if (result.info.width < 400 || result.info.height < 300) throw new Error("IMAGE_TOO_SMALL");
  const contentHash = createHash("sha256").update(result.data).digest("hex");
  const perceptualHash = await dHash(result.data);
  return { buffer: result.data, width: result.info.width, height: result.info.height, bytes: result.data.length, mime: "image/webp", contentHash, perceptualHash };
}

/** 64-bit difference hash (dHash) as 16 hex chars. Robust to re-encoding and small resizes. */
export async function dHash(buf: Buffer): Promise<string> {
  const { data } = await sharp(buf).grayscale().resize(9, 8, { fit: "fill" }).raw().toBuffer({ resolveWithObject: true });
  let bits = "";
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const left = data[row * 9 + col]!;
      const right = data[row * 9 + col + 1]!;
      bits += left > right ? "1" : "0";
    }
  }
  return BigInt("0b" + bits).toString(16).padStart(16, "0");
}

export function hammingDistance(a: string, b: string): number {
  let x = BigInt("0x" + a) ^ BigInt("0x" + b);
  let n = 0;
  while (x) { n += Number(x & BigInt(1)); x >>= BigInt(1); }
  return n;
}

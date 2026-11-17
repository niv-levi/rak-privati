import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { sniffImageType, processImage, hammingDistance, dHash } from "@/features/images/process";
import { translateDbError } from "@/lib/actions/result";

async function jpegWithGps(w = 800, h = 600) {
  return sharp({ create: { width: w, height: h, channels: 3, background: { r: 22, g: 69, b: 74 } } })
    .jpeg()
    .withExif({ IFD0: { Make: "TestCam", Copyright: "owner" }, IFD3: { GPSLatitudeRef: "N", GPSLatitude: "32/1 4/1 0/1" } })
    .toBuffer();
}

describe("image validation and processing", () => {
  it("detects real image types by magic bytes", async () => {
    expect(sniffImageType(await jpegWithGps())).toBe("image/jpeg");
    expect(sniffImageType(await sharp({ create: { width: 10, height: 10, channels: 3, background: "#fff" } }).png().toBuffer())).toBe("image/png");
  });

  it("rejects SVG, HTML and executables regardless of extension", () => {
    expect(sniffImageType(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'))).toBeNull();
    expect(sniffImageType(Buffer.from("<!doctype html><html><body>x</body></html>"))).toBeNull();
    expect(sniffImageType(Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0, 0, 0, 0x04, 0, 0, 0]))).toBeNull();
  });

  it("strips EXIF/GPS metadata and re-encodes as WebP", async () => {
    const input = await jpegWithGps();
    expect((await sharp(input).metadata()).exif).toBeDefined();
    const out = await processImage(input);
    expect(out.mime).toBe("image/webp");
    const meta = await sharp(out.buffer).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.exif).toBeUndefined();
    expect(out.contentHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("downscales very large images and rejects tiny ones", async () => {
    const big = await processImage(await jpegWithGps(4000, 3000));
    expect(Math.max(big.width, big.height)).toBeLessThanOrEqual(1920);
    await expect(processImage(await jpegWithGps(200, 150))).rejects.toThrow("IMAGE_TOO_SMALL");
  });

  it("applies rotation and crop fractions", async () => {
    const rotated = await processImage(await jpegWithGps(1200, 800), { rotate: 90 });
    expect(rotated.height).toBeGreaterThan(rotated.width);
    const cropped = await processImage(await jpegWithGps(1600, 1200), { crop: { x: 0, y: 0, w: 0.5, h: 0.5 } });
    expect(cropped.width).toBe(800);
    expect(cropped.height).toBe(600);
  });

  it("perceptual hash identifies near-duplicates after re-encoding", async () => {
    const base = await sharp({ create: { width: 640, height: 480, channels: 3, background: "#fff" } }).composite([{ input: Buffer.from('<svg width="640" height="480"><rect x="80" y="60" width="300" height="200" fill="#16454A"/></svg>'), top: 0, left: 0 }]).jpeg({ quality: 95 }).toBuffer();
    const reencoded = await sharp(base).resize(500).jpeg({ quality: 60 }).toBuffer();
    const different = await sharp({ create: { width: 640, height: 480, channels: 3, background: "#000" } }).composite([{ input: Buffer.from('<svg width="640" height="480"><circle cx="500" cy="380" r="90" fill="#C48A45"/></svg>'), top: 0, left: 0 }]).jpeg().toBuffer();
    const [a, b, c] = await Promise.all([dHash(base), dHash(reencoded), dHash(different)]);
    expect(hammingDistance(a, b)).toBeLessThanOrEqual(4);
    expect(hammingDistance(a, c)).toBeGreaterThan(10);
  });
});

describe("database error translation", () => {
  it.each([
    ["LISTING_LIMIT_EXCEEDED", /המרבי/],
    ["DECLARATION_REQUIRED", /הצהרת מוכר פרטי/],
    ["LISTING_NEEDS_PHOTOS", /שלוש תמונות/],
    ["LISTING_TRANSITION_FORBIDDEN: pending_review -> active", /לא ניתן/],
    ["new row violates row-level security policy", /אין הרשאה/],
  ])("%s", (code, re) => expect(translateDbError(code)).toMatch(re));
  it("never leaks raw SQL errors", () => expect(translateDbError('relation "x" does not exist')).toBe("אירעה שגיאה. נסו שוב מאוחר יותר."));
});

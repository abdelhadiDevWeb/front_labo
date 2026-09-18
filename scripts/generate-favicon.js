/**
 * Build circular favicons for Google / browsers (transparent corners).
 * Google Search prefers multiples of 48px (48, 96, 192).
 */
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const ROOT = path.join(__dirname, "..");
const INPUT = path.join(ROOT, "public", "pi", "logo-dz-labomarket.png");

async function makeCircleIcon(size, outPath) {
  const resized = await sharp(INPUT)
    .resize(size, size, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .png()
    .toBuffer();

  // Perfect circle mask (rx/ry = half size)
  const circle = Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/>
    </svg>`
  );

  await sharp(resized)
    .composite([{ input: circle, blend: "dest-in" }])
    .png()
    .toFile(outPath);

  console.log("wrote", path.relative(ROOT, outPath));
}

(async () => {
  if (!fs.existsSync(INPUT)) {
    throw new Error(`Missing logo: ${INPUT}`);
  }

  const outs = [
    [32, path.join(ROOT, "public", "favicon-32.png")],
    [48, path.join(ROOT, "public", "favicon.png")],
    [48, path.join(ROOT, "public", "icon.png")],
    [96, path.join(ROOT, "public", "favicon-96.png")],
    [180, path.join(ROOT, "public", "apple-icon.png")],
    [192, path.join(ROOT, "public", "icon-192.png")],
    [512, path.join(ROOT, "public", "icon-512.png")],
    // Next.js App Router icon files
    [32, path.join(ROOT, "app", "icon.png")],
    [180, path.join(ROOT, "app", "apple-icon.png")],
  ];

  for (const [size, out] of outs) {
    await makeCircleIcon(size, out);
  }

  // ICO from 32px circle PNG
  await sharp(path.join(ROOT, "public", "favicon-32.png"))
    .resize(32, 32)
    .png()
    .toFile(path.join(ROOT, "public", "favicon.ico"));

  console.log("done — all icons are circular");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

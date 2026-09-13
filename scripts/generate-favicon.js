const sharp = require("sharp");
const path = require("path");

async function makeRoundedIcon(size, radius, outPath) {
  const input = path.join("public", "pi", "logo-dz-labomarket.png");
  const resized = await sharp(input)
    .resize(size, size, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .png()
    .toBuffer();

  const rounded = Buffer.from(
    `<svg width="${size}" height="${size}"><rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="#fff"/></svg>`
  );

  await sharp(resized)
    .composite([{ input: rounded, blend: "dest-in" }])
    .png()
    .toFile(outPath);

  console.log("wrote", outPath);
}

(async () => {
  await makeRoundedIcon(32, 8, path.join("app", "icon.png"));
  await makeRoundedIcon(180, 40, path.join("app", "apple-icon.png"));
  await makeRoundedIcon(48, 10, path.join("public", "favicon.png"));
  await makeRoundedIcon(32, 8, path.join("public", "favicon-32.png"));
  await sharp(path.join("public", "favicon.png"))
    .resize(32, 32)
    .png()
    .toFile(path.join("public", "favicon.ico"));
  console.log("done");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const dir = "assets/logo-samples";
const names = fs.readdirSync(dir).filter((f) => f.endsWith(".svg")).sort();
(async () => {
  const tiles = [];
  for (const n of names) {
    const svg = fs.readFileSync(path.join(dir, n));
    const png = path.join(dir, n.replace(/\.svg$/, ".png"));
    await sharp(svg).resize(512, 512).png().toFile(png);
    tiles.push(png);
    console.log(n, "->", png);
  }
  const gap = 24;
  const sheet = sharp({
    create: { width: 512 * 3 + gap * 4, height: 512 * 2 + gap * 3, channels: 3, background: "#1A1020" },
  });
  const composites = tiles.map((p, i) => ({
    input: p,
    left: gap + (i % 3) * (512 + gap),
    top: gap + Math.floor(i / 3) * (512 + gap),
  }));
  await sheet.composite(composites).png().toFile(path.join(dir, "contact-sheet.png"));
  console.log("contact-sheet.png");
})();

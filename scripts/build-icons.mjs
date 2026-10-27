// Generates every PNG icon Haven needs from the SVG sources in assets/icons.
// Run with: npm run icons
// Deterministic: re-running produces byte-identical files.

import path from 'node:path';
import { statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// The icon's own field, so flattened corners and the adaptive background match
// the artwork instead of showing a seam.
const PLUM = '#17101C';

const ICON = path.join(root, 'assets/icons/haven-icon.svg');
const GLYPH = path.join(root, 'assets/icons/haven-glyph.svg');
const MONO = path.join(root, 'assets/icons/haven-monochrome.svg');

/**
 * @type {Array<{
 *   file: string,
 *   size: number,
 *   source?: string,
 *   fill?: string,
 *   flatten?: boolean,
 *   alpha: boolean,
 * }>}
 */
const outputs = [
  { file: 'assets/images/icon.png', size: 1024, source: ICON, flatten: true, alpha: false },
  { file: 'assets/images/android-icon-foreground.png', size: 1024, source: GLYPH, alpha: true },
  { file: 'assets/images/android-icon-background.png', size: 1024, fill: PLUM, alpha: false },
  { file: 'assets/images/android-icon-monochrome.png', size: 1024, source: MONO, alpha: true },
  { file: 'assets/images/splash-icon.png', size: 512, source: GLYPH, alpha: true },
  { file: 'assets/images/favicon.png', size: 48, source: ICON, flatten: true, alpha: false },
  { file: 'assets/icon.png', size: 1024, source: ICON, flatten: true, alpha: false },
  { file: 'public/logo192.png', size: 192, source: ICON, flatten: true, alpha: false },
  { file: 'public/logo512.png', size: 512, source: ICON, flatten: true, alpha: false },
  { file: 'public/apple-touch-icon.png', size: 180, source: ICON, flatten: true, alpha: false },
];

async function build({ file, size, source, fill, flatten, alpha }) {
  const target = path.join(root, file);

  let pipeline;
  if (fill) {
    pipeline = sharp({
      create: { width: size, height: size, channels: 3, background: fill },
    });
  } else {
    pipeline = sharp(source).resize(size, size, { fit: 'contain' });
    if (flatten) {
      pipeline = pipeline.flatten({ background: PLUM }).removeAlpha();
    }
  }

  await pipeline.png({ compressionLevel: 9 }).toFile(target);

  const meta = await sharp(target).metadata();
  if (meta.width !== size || meta.height !== size) {
    throw new Error(
      `${file}: expected ${size}x${size}, got ${meta.width}x${meta.height}`,
    );
  }
  if (Boolean(meta.hasAlpha) !== alpha) {
    throw new Error(
      `${file}: expected hasAlpha=${alpha}, got hasAlpha=${meta.hasAlpha}`,
    );
  }

  return {
    file,
    size,
    hasAlpha: Boolean(meta.hasAlpha),
    bytes: statSync(target).size,
  };
}

const results = [];
for (const output of outputs) {
  results.push(await build(output));
}

for (const r of results) {
  console.log(
    `${r.file.padEnd(48)} ${String(r.size).padStart(4)}px  alpha=${r.hasAlpha}  ${r.bytes} B`,
  );
}
console.log(`\nWrote ${results.length} icons.`);

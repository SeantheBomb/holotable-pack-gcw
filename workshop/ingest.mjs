// Model ingest pipeline shared by the workshop server and the CLI:
//   node workshop/ingest.mjs <ship> <file.glb> --title "…" --author "…" --license "CC-BY 4.0" --url https://…
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const SHIPS = { lancer: 'T-65 X-wing', bulwark: 'BTL-A4 Y-wing', dart: 'TIE/ln Fighter', stiletto: 'TIE Advanced x1' };
export const LICENSES = ['CC-BY 4.0', 'CC-BY-SA 4.0', 'CC0 1.0', 'Own work (CC-BY 4.0)'];
const TARGET_TRIS = 28000;
const models = p => join(ROOT, 'models', p);

const readJson = (p, fallback) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : fallback);
export const readSettings = () => readJson(models('models.json'), {});
export const readCredits = () => readJson(models('CREDITS.json'), []);

function countTris(doc) {
  let n = 0;
  for (const mesh of doc.getRoot().listMeshes()) for (const prim of mesh.listPrimitives()) {
    const idx = prim.getIndices(), pos = prim.getAttribute('POSITION');
    n += Math.floor((idx ? idx.getCount() : pos ? pos.getCount() : 0) / 3);
  }
  return n;
}

/** Writes models/<ship>.glb (optimised) + <ship>.original.glb (kept locally, never published). */
export async function ingest(ship, sourcePath, credit, log = console.log) {
  if (!SHIPS[ship]) throw new Error(`Unknown ship "${ship}". Use one of: ${Object.keys(SHIPS).join(', ')}`);
  if (!LICENSES.includes(credit.license)) throw new Error(`Licence must be one of: ${LICENSES.join(' | ')} (no NC/ND licences, no game rips).`);
  if (!credit.author || !credit.url) throw new Error('Author and source URL are required for attribution.');
  mkdirSync(models(''), { recursive: true });
  const original = models(`${ship}.original.glb`), out = models(`${ship}.glb`);
  if (sourcePath !== original) copyFileSync(sourcePath, original);

  let before = 0, after = 0;
  try {
    const { NodeIO } = await import('@gltf-transform/core');
    const { ALL_EXTENSIONS } = await import('@gltf-transform/extensions');
    const { dedup, prune, weld, simplify } = await import('@gltf-transform/functions');
    const { MeshoptSimplifier } = await import('meshoptimizer');
    const sharp = (await import('sharp')).default;
    const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
    const doc = await io.read(original);
    before = countTris(doc);
    const steps = [dedup(), prune(), weld()];
    if (before > TARGET_TRIS) { await MeshoptSimplifier.ready; steps.push(simplify({ simplifier: MeshoptSimplifier, ratio: TARGET_TRIS / before, error: 0.002 })); }
    await doc.transform(...steps);
    // Per-texture so one odd image (16-bit, CMYK…) can't sink the whole model.
    const { EXTTextureWebP } = await import('@gltf-transform/extensions');
    let converted = 0;
    for (const tex of doc.getRoot().listTextures()) {
      const img = tex.getImage(); if (!img) continue;
      for (const attempt of [i => sharp(i), i => sharp(i).toColourspace('srgb'), i => sharp(i, { failOn: 'none' }).pipelineColourspace('srgb').toColourspace('srgb')]) {
        try {
          const webp = await attempt(img).resize(1024, 1024, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
          if (webp.length < img.length) { tex.setImage(webp).setMimeType('image/webp'); if (tex.getURI()) tex.setURI(tex.getURI().replace(/\.\w+$/, '.webp')); converted++; }
          break;
        } catch { /* try the next decode strategy */ }
      }
    }
    if (converted) doc.createExtension(EXTTextureWebP).setRequired(true);
    after = countTris(doc);
    await io.write(out, doc);
    log(`${ship}: ${before.toLocaleString()} → ${after.toLocaleString()} triangles, ${(statSync(original).size / 1e6).toFixed(1)} MB → ${(statSync(out).size / 1e6).toFixed(1)} MB`);
  } catch (e) {
    log(`Optimiser unavailable or failed (${e.message}); publishing the original file as-is.`);
    copyFileSync(original, out);
  }
  if (statSync(out).size > 24 * 1024 * 1024) throw new Error('Model is still over the 25 MB hosting limit after optimisation.');

  const credits = readCredits().filter(c => c.ship !== ship);
  credits.push({ ship, what: `${SHIPS[ship]} model — "${credit.title || SHIPS[ship]}"`, author: credit.author, license: credit.license, url: credit.url });
  writeFileSync(models('CREDITS.json'), JSON.stringify(credits, null, 1));
  const settings = readSettings();
  settings[ship] = { yaw: 0, scale: 1, ...settings[ship], triangles: after || before, bytes: statSync(out).size };
  writeFileSync(models('models.json'), JSON.stringify(settings, null, 1));
  rebuild(log);
  return settings[ship];
}

export function saveSettings(ship, patch, log = console.log) {
  const settings = readSettings();
  settings[ship] = { ...settings[ship], ...patch };
  writeFileSync(models('models.json'), JSON.stringify(settings, null, 1));
  rebuild(log);
}

export function rebuild(log = console.log) {
  if (!existsSync(join(ROOT, 'xwing-data2'))) execSync('git clone --depth 1 https://github.com/xwingtmg/xwing-data2', { cwd: ROOT, stdio: 'ignore' });
  log(execSync('node build.mjs ./xwing-data2', { cwd: ROOT }).toString().trim());
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [ship, file, ...rest] = process.argv.slice(2);
  const arg = k => { const i = rest.indexOf(`--${k}`); return i >= 0 ? rest[i + 1] : ''; };
  ingest(ship, file, { title: arg('title'), author: arg('author'), license: arg('license') || 'CC-BY 4.0', url: arg('url') }).catch(e => { console.error(e.message); process.exit(1); });
}

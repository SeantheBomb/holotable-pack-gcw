// Local model workshop: `npm run workshop` → http://localhost:5190
// Drag in a GLB, fill the attribution, tune facing/scale against the base, then Publish. No agent needed.
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { createReadStream, existsSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { LICENSES, ROOT, SHIPS, ingest, readCredits, readSettings, rebuild, saveSettings } from './ingest.mjs';

const PORT = 5190;
const json = (res, body, status = 200) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
const body = req => new Promise((ok, bad) => { const chunks = []; req.on('data', c => chunks.push(c)); req.on('end', () => ok(Buffer.concat(chunks))); req.on('error', bad); });

function state() {
  const settings = readSettings(), credits = readCredits();
  return {
    licenses: LICENSES,
    ships: Object.entries(SHIPS).map(([id, name]) => {
      const file = join(ROOT, 'models', `${id}.glb`);
      return { id, name, present: existsSync(file), bytes: existsSync(file) ? statSync(file).size : 0, settings: settings[id] ?? { yaw: 0, scale: 1 }, credit: credits.find(c => c.ship === id) ?? null };
    }),
  };
}

let publishing = false;

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  try {
    if (url.pathname === '/') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(readFileSync(join(ROOT, 'workshop', 'index.html'))); }
    if (url.pathname === '/api/state') return json(res, state());
    const m = url.pathname.match(/^\/models\/(\w+)\.glb$/);
    if (m && SHIPS[m[1]] && existsSync(join(ROOT, 'models', `${m[1]}.glb`))) { res.writeHead(200, { 'content-type': 'model/gltf-binary', 'cache-control': 'no-store' }); return createReadStream(join(ROOT, 'models', `${m[1]}.glb`)).pipe(res); }

    if (url.pathname === '/api/upload' && req.method === 'POST') {
      const q = Object.fromEntries(url.searchParams);
      if (q.confirmed !== 'yes') return json(res, { error: 'Confirm the model is the uploader’s original work (not a game rip) and that the licence allows redistribution.' }, 400);
      const data = await body(req);
      if (data.subarray(0, 4).toString() !== 'glTF') return json(res, { error: 'That is not a binary glTF (.glb) file.' }, 400);
      const tmp = join(tmpdir(), `workshop-${Date.now()}.glb`);
      writeFileSync(tmp, data);
      const log = [];
      try { await ingest(q.ship, tmp, { title: q.title, author: q.author, license: q.license, url: q.url }, l => log.push(l)); }
      finally { try { unlinkSync(tmp); } catch { /* already gone */ } }
      return json(res, { ok: true, log, state: state() });
    }
    if (url.pathname === '/api/settings' && req.method === 'POST') {
      const p = JSON.parse((await body(req)).toString());
      if (!SHIPS[p.ship]) return json(res, { error: 'Unknown ship.' }, 400);
      saveSettings(p.ship, { yaw: Number(p.yaw) || 0, scale: Math.max(0.2, Math.min(3, Number(p.scale) || 1)) }, () => {});
      return json(res, { ok: true, state: state() });
    }
    if (url.pathname === '/api/remove' && req.method === 'POST') {
      const { ship } = JSON.parse((await body(req)).toString());
      if (!SHIPS[ship]) return json(res, { error: 'Unknown ship.' }, 400);
      for (const f of [`${ship}.glb`, `${ship}.original.glb`]) { const p = join(ROOT, 'models', f); if (existsSync(p)) unlinkSync(p); }
      writeFileSync(join(ROOT, 'models', 'CREDITS.json'), JSON.stringify(readCredits().filter(c => c.ship !== ship), null, 1));
      rebuild(() => {});
      return json(res, { ok: true, state: state() });
    }
    if (url.pathname === '/api/publish' && req.method === 'POST') {
      if (publishing) return json(res, { error: 'A publish is already running.' }, 409);
      publishing = true;
      res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
      const steps = [['node', ['publish.mjs']], ['git', ['add', '-A']], ['git', ['commit', '-m', 'Update Models via Workshop']], ['git', ['push']]];
      for (const [cmd, args] of steps) {
        res.write(`\n$ ${cmd} ${args.join(' ')}\n`);
        const code = await new Promise(done => { const p = spawn(cmd, args, { cwd: ROOT }); p.stdout.on('data', d => res.write(d)); p.stderr.on('data', d => res.write(d)); p.on('close', done); });
        if (code !== 0 && cmd !== 'git') { res.write(`\nFAILED (exit ${code})\n`); break; }
      }
      publishing = false;
      return res.end('\nDone. Players get the new models on their next page load.\n');
    }
    json(res, { error: 'Not found' }, 404);
  } catch (e) { publishing = false; if (!res.headersSent) json(res, { error: e.message }, 500); else res.end(`\nERROR: ${e.message}\n`); }
}).listen(PORT, '127.0.0.1', () => console.log(`Model workshop: http://localhost:${PORT}`));

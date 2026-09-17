# Galactic Civil War — fan presentation pack

A **presentation-only** overlay for the Squadron Holotable engine: names, card text and (optionally) 3D
models. It contains no game logic. The engine is fully playable without it.

**Unofficial and non-commercial.** Not affiliated with, endorsed, sponsored or approved by Lucasfilm Ltd.,
The Walt Disney Company, Atomic Mass Games, Asmodee or Fantasy Flight Games. All trademarks and
copyrights belong to their owners. No licence is claimed over any of their material. If a rights holder
asks for this pack to be removed, it will be removed immediately.

## Build

```bash
git clone --depth 1 https://github.com/xwingtmg/xwing-data2
node build.mjs ./xwing-data2
```

## Models — use the workshop (no agent, no command line beyond one start command)

```bash
npm install
npm run workshop
```

Open http://localhost:5190, pick a ship slot, drop in a `.glb`, paste the Sketchfab credit line (it fills in
title / author / licence / URL), tick the provenance box and press **Import model**. The workshop keeps your
original locally, decimates to ~30–45k triangles, recompresses textures to WebP, records the credit in
`models/CREDITS.json`, and rebuilds `pack.json`. Line the nose up with the arrow and size it over the base with
the sliders, then press **Publish pack** — that deploys to Cloudflare and pushes to GitHub. Players see the new
models on their next page load, and every credit appears in the game's *Credits & legal* screen.

Rules for models: CC-BY / CC-BY-SA / CC0 only (no NC/ND), **never game rips**, and confirm the mesh is the
uploader's own work. A CC licence covers the modeller's mesh only — it cannot grant rights in the underlying
ship design, which is why this pack lives apart from the engine.

Scripted alternative: `node workshop/ingest.mjs <lancer|bulwark|dart|stiletto> file.glb --title … --author … --license "CC-BY 4.0" --url …`

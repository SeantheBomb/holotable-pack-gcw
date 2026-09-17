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

## Models

`models/` is empty by default. To add ships, drop glTF binaries named by engine ship id and re-run the build:

| File | Ship | Candidate (CC-BY, verify provenance + credit the author) |
|---|---|---|
| `models/lancer.glb` | T-65 X-wing | https://sketchfab.com/3d-models/a93f607a94d747568371b8910a81fb12 |
| `models/bulwark.glb` | BTL-A4 Y-wing | https://sketchfab.com/3d-models/b8bb6476b1b14ba48987c7efc7b7087a |
| `models/dart.glb` | TIE/ln | https://sketchfab.com/3d-models/79d9403f15334c129ea5454daffe6b5c |
| `models/stiletto.glb` | TIE Advanced x1 | https://sketchfab.com/3d-models/83654f360e1e4c72b716a2a60ed09031 |

Rules for models: CC-BY or more permissive only (no NC/ND), **never game rips**, confirm the mesh is the
uploader's own work, decimate to ~15–25k triangles, and list every model in `models/CREDITS.json`:

```json
[{ "what": "T-65 model", "author": "Name", "license": "CC-BY 4.0", "url": "https://…" }]
```

The engine auto-scales models to the base size; use `modelYaw` / `modelScale` in `pack.json` if one needs a nudge
(models should point +Z). A CC licence covers the modeller's mesh only — it cannot grant rights in the
underlying ship design, which is why this pack lives apart from the engine.

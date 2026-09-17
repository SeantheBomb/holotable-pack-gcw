// Builds pack.json from the community xwing-data2 dataset (https://github.com/xwingtmg/xwing-data2).
// Usage: node build.mjs <path-to-xwing-data2>
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const src = process.argv[2];
if (!src) { console.error('usage: node build.mjs <path-to-xwing-data2>'); process.exit(1); }
const data = join(src, 'data');

const SHIPS = { lancer: ['rebel-alliance', 't-65-x-wing'], bulwark: ['rebel-alliance', 'btl-a4-y-wing'], dart: ['galactic-empire', 'tie-ln-fighter'], stiletto: ['galactic-empire', 'tie-advanced-x1'] };
const PILOTS = {
  'lancer-escort': 'bluesquadronescort', 'lancer-veteran': 'redsquadronveteran', 'lancer-shepherd': 'garvendreis-t65xwing', 'lancer-prodigy': 'lukeskywalker',
  'lancer-deadeye': 'wedgeantilles', 'lancer-prodigy-sl': 'lukeskywalker-swz106', 'bulwark-bomber': 'graysquadronbomber', 'bulwark-veteran': 'goldsquadronveteran',
  'bulwark-overseer': 'hortonsalm', 'bulwark-bulldog': 'norrawexley-btla4ywing', 'dart-cadet': 'academypilot', 'dart-pilot': 'obsidiansquadronpilot', 'dart-ace': 'blacksquadronace',
  'dart-nightowl': 'nightbeast', 'dart-baron': 'valenrudor', 'dart-vulture': 'gideonhask', 'dart-brawler': 'maulermithel', 'dart-needle': 'scourgeskutu', 'dart-packleader': 'howlrunner',
  'stiletto-pilot': 'tempestsquadronpilot', 'stiletto-ace': 'stormsquadronace', 'stiletto-comet': 'junoeclipse', 'stiletto-warlord': 'darthvader', 'stiletto-warlord-sl': 'darthvader-swz105',
};
const UPGRADES = {
  'heavy-torpedoes': 'protontorpedoes', 'ion-missiles': 'ionmissiles', 'ion-turret': 'ioncannonturret', 'dorsal-turret': 'dorsalturret', 'shield-upgrade': 'shieldupgrade',
  'hull-upgrade': 'hullupgrade', afterburners: 'afterburners', elusive: 'elusive', predator: 'predator', marksmanship: 'marksmanship', 'crack-shot': 'crackshot', outmaneuver: 'outmaneuver',
  'fire-control': 'firecontrolsystem', 'instinctive-aim': 'instinctiveaim', 'evasive-insight': 'brilliantevasion', wrath: 'hate', 'field-droid': 'r2astromech', 'ace-droid': 'r2d2', 'salvage-droid': 'r5astromech',
};
const MODELS = { lancer: 'models/lancer.glb', bulwark: 'models/bulwark.glb', dart: 'models/dart.glb', stiletto: 'models/stiletto.glb' };

const clean = t => (t ?? '').replace(/\[Critical Hit\]/g, 'crit').replace(/\[([^\]]+)\]/g, (_, w) => w.toLowerCase());
const pack = { name: 'Galactic Civil War (fan pack)', terms: { force: 'Force' }, factions: { coalition: { name: 'Rebel Alliance' }, dominion: { name: 'Galactic Empire' } }, ships: {}, pilots: {}, upgrades: {}, credits: [] };

const pilotIndex = new Map();
for (const [id, [faction, file]] of Object.entries(SHIPS)) {
  const ship = JSON.parse(readFileSync(join(data, 'pilots', faction, `${file}.json`), 'utf8'));
  const ability = ship.pilots.find(p => p.shipAbility)?.shipAbility;
  pack.ships[id] = { name: ship.name, ...(ability ? { abilityName: ability.name, abilityText: clean(ability.text) } : {}), ...(existsSync(MODELS[id]) ? { model: MODELS[id] } : {}) };
  for (const p of ship.pilots) pilotIndex.set(p.xws, p);
}
for (const [id, xws] of Object.entries(PILOTS)) {
  const p = pilotIndex.get(xws);
  if (!p) { console.warn('missing pilot', xws); continue; }
  pack.pilots[id] = { name: p.name, caption: p.caption || undefined, text: p.ability ? clean(p.ability) : undefined, xws };
}
const upgradeIndex = new Map();
for (const f of readdirSync(join(data, 'upgrades'))) for (const u of JSON.parse(readFileSync(join(data, 'upgrades', f), 'utf8'))) upgradeIndex.set(u.xws, u);
for (const [id, xws] of Object.entries(UPGRADES)) {
  const u = upgradeIndex.get(xws);
  if (!u) { console.warn('missing upgrade', xws); continue; }
  const side = u.sides[0];
  pack.upgrades[id] = { name: u.name, text: clean(side.ability) || undefined, xws };
}
pack.credits.push({ what: 'Card names and rules text dataset', author: 'xwing-data2 contributors', license: 'MIT (dataset structure); card text © its rights holders', url: 'https://github.com/xwingtmg/xwing-data2' });
if (existsSync('models/CREDITS.json')) pack.credits.push(...JSON.parse(readFileSync('models/CREDITS.json', 'utf8')));
writeFileSync('pack.json', JSON.stringify(pack, null, 1));
console.log(`pack.json: ${Object.keys(pack.pilots).length} pilots, ${Object.keys(pack.upgrades).length} upgrades, models: ${Object.values(pack.ships).filter(s => s.model).length}/4`);

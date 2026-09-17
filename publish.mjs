// Rebuilds pack.json, stages the public files and deploys them to Cloudflare Pages.
// Usage: node publish.mjs [--no-deploy]
import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';

const run = cmd => execSync(cmd, { stdio: 'inherit' });
if (!existsSync('xwing-data2')) run('git clone --depth 1 https://github.com/xwingtmg/xwing-data2');
run('node build.mjs ./xwing-data2');
rmSync('dist', { recursive: true, force: true });
mkdirSync('dist/models', { recursive: true });
cpSync('pack.json', 'dist/pack.json');
cpSync('models', 'dist/models', { recursive: true, filter: f => !f.endsWith('.original.glb') });
writeFileSync('dist/_headers', '/*\n  Access-Control-Allow-Origin: *\n  Cache-Control: public, max-age=300\n');
if (!process.argv.includes('--no-deploy')) run('npx wrangler deploy');

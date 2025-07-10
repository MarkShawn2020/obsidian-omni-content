import {readFileSync, writeFileSync} from 'fs';
import {resolve} from 'path';

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const version = packageJson.version;

// 同步 manifest.json
const manifestPath = resolve('packages/obsidian/manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
manifest.version = version;
writeFileSync(manifestPath, JSON.stringify(manifest, null, '\t') + '\n');

const obsidianPackagePath = resolve('packages/obsidian/package.json');
const obsidianPackage = JSON.parse(readFileSync(obsidianPackagePath, 'utf8'));
obsidianPackage.version = version;
writeFileSync(obsidianPackagePath, JSON.stringify(obsidianPackage, null, '\t') + '\n');

// 同步 frontend/package.json
const vitePackagePath = resolve('packages/frontend/package.json');
const vitePackage = JSON.parse(readFileSync(vitePackagePath, 'utf8'));
vitePackage.version = version;
writeFileSync(vitePackagePath, JSON.stringify(vitePackage, null, '\t') + '\n');

console.log(`✅ 版本同步完成: ${version}`);

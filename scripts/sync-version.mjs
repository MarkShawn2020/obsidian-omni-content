import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const version = packageJson.version;

// 同步 manifest.json
const manifestPath = resolve('manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
manifest.version = version;
writeFileSync(manifestPath, JSON.stringify(manifest, null, '\t') + '\n');

// 同步 frontend/package.json
const vitePackagePath = resolve('frontend/package.json');
const vitePackage = JSON.parse(readFileSync(vitePackagePath, 'utf8'));
vitePackage.version = version;
writeFileSync(vitePackagePath, JSON.stringify(vitePackage, null, '\t') + '\n');

console.log(`✅ 版本同步完成: ${version}`);
console.log(`   - manifest.json: ${version}`);
console.log(`   - vite-react/package.json: ${version}`);

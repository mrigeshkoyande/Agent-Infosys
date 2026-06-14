import { readFileSync } from 'node:fs';

const requiredFiles = ['index.html', 'src/main.js', 'src/styles.css'];
for (const file of requiredFiles) {
  const content = readFileSync(file, 'utf8');
  if (!content.trim()) throw new Error(`${file} is empty`);
}

const html = readFileSync('index.html', 'utf8');
if (!html.includes('/src/main.js')) throw new Error('index.html must load src/main.js');
if (!html.includes('SkillBridge Agent')) throw new Error('index.html title missing');

const js = readFileSync('src/main.js', 'utf8');
for (const token of ['scorePathway', 'roleSignals', 'pathways', 'render']) {
  if (!js.includes(token)) throw new Error(`src/main.js missing ${token}`);
}

console.log('Static app validation passed.');

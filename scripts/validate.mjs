import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const requiredFiles = [
  'index.html',
  'src/main.js',
  'src/styles.css',
  'backend/server.py',
  'backend/db.py',
  'backend/auth.py',
  'backend/agent.py',
];

for (const file of requiredFiles) {
  if (!existsSync(file)) throw new Error(`${file} is missing`);
  const content = readFileSync(file, 'utf8');
  if (!content.trim()) throw new Error(`${file} is empty`);
}

const html = readFileSync('index.html', 'utf8');
if (!html.includes('/src/main.js')) throw new Error('index.html must load src/main.js');
if (!html.includes('SkillBridge Agent')) throw new Error('index.html title missing');

const js = readFileSync('src/main.js', 'utf8');
for (const token of ['demoLogin', 'manualLogin', 'runAnalysis', '/api/analyze']) {
  if (!js.includes(token)) throw new Error(`src/main.js missing ${token}`);
}

const backend = readFileSync('backend/server.py', 'utf8');
for (const token of ['/api/auth/login', '/api/auth/demo', '/api/analyze', 'ThreadingHTTPServer']) {
  if (!backend.includes(token)) throw new Error(`backend/server.py missing ${token}`);
}

const python = spawnSync('python', ['-m', 'compileall', '-q', 'backend'], { stdio: 'inherit' });
if (python.status !== 0) throw new Error('Python backend compile failed');

console.log('Full-stack app validation passed.');

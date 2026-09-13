const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');

fs.rmSync(dist, { recursive: true, force: true });

const { execFileSync } = require('child_process');
const npmCommand = process.platform === 'win32' ? 'tsc.cmd' : 'tsc';
execFileSync(npmCommand, ['-p', path.join(root, 'tsconfig.json')], { cwd: root, stdio: 'inherit' });

fs.mkdirSync(path.join(dist, 'dashboard', 'public'), { recursive: true });
fs.mkdirSync(path.join(dist, 'extension', 'webview'), { recursive: true });
fs.copyFileSync(path.join(root, 'src', 'dashboard', 'public', 'index.html'), path.join(dist, 'dashboard', 'public', 'index.html'));
fs.copyFileSync(path.join(root, 'src', 'extension', 'webview', 'companion.js'), path.join(dist, 'extension', 'webview', 'companion.js'));

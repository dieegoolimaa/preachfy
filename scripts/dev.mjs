// Starts the local database, the API and the web app together.
import { spawn } from 'node:child_process';
import { networkInterfaces } from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const address = Object.values(networkInterfaces()).flat().find((item) => item.family === 'IPv4' && !item.internal)?.address;
const env = { ...process.env, ...(address ? { DEV_ORIGINS: `http://${address}:8081` } : {}) };
const run = (command, args, cwd) => spawn(command, args, { cwd: path.join(root, cwd), stdio: 'inherit', env });

const children = [run('node', ['scripts/dev-db.mjs'], '.')];
await new Promise((resolve) => setTimeout(resolve, 3000));
children.push(run('npx', ['nest', 'start', '--watch'], 'apps/api'));
children.push(run('npx', ['expo', 'start', '--web', '--port', '8081'], 'apps/mobile'));

if (address) {
  console.log(`\nNo iPhone, na mesma rede Wi-Fi:\n  Expo Go: exp://${address}:8081\n  Navegador: http://${address}:8081\n`);
}

const stop = () => children.forEach((child) => child.kill('SIGINT'));
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

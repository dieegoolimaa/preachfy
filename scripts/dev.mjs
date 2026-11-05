// Starts what is missing for local work and leaves alone what is already running.
// `--api` skips the web app, for when Expo is already open in another terminal.
import { spawn } from 'node:child_process';
import net from 'node:net';
import { networkInterfaces } from 'node:os';
import path from 'node:path';

const DATABASE = 27018;
const API = 3001;
const WEB = 8081;

const root = path.resolve(import.meta.dirname, '..');
const address = Object.values(networkInterfaces()).flat().find((item) => item.family === 'IPv4' && !item.internal)?.address;
const env = { ...process.env, ALLOW_DEV_PRO: '1', ...(address ? { DEV_ORIGINS: `http://${address}:${WEB}` } : {}) };
const children = [];
const run = (command, args, cwd) => children.push(spawn(command, args, { cwd: path.join(root, cwd), stdio: 'inherit', env }));

const listening = (port) =>
  new Promise((resolve) => {
    const socket = net.connect(port, '127.0.0.1');
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
  });

async function waitFor(port) {
  for (let i = 0; i < 60 && !(await listening(port)); i++) await new Promise((resolve) => setTimeout(resolve, 500));
}

if (await listening(DATABASE)) console.log('Banco local já está rodando.');
else {
  run('node', ['scripts/dev-db.mjs'], '.');
  await waitFor(DATABASE);
}

if (await listening(API)) console.log('API já está rodando.');
else run('npx', ['nest', 'start', '--watch'], 'apps/api');

if (!process.argv.includes('--api')) {
  if (await listening(WEB)) console.log('Expo já está rodando.');
  else run('npx', ['expo', 'start', '--web', '--port', String(WEB)], 'apps/mobile');
}

if (address) {
  console.log(`\nNo iPhone, na mesma rede Wi-Fi:\n  Expo Go: exp://${address}:${WEB}\n  Navegador: http://${address}:${WEB}\n`);
}

const stop = () => children.forEach((child) => child.kill('SIGINT'));
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

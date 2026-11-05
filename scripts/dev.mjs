// Starts the local database, the API and the web app together.
import { spawn } from 'node:child_process';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const run = (command, args, cwd) => spawn(command, args, { cwd: path.join(root, cwd), stdio: 'inherit' });

const children = [run('node', ['scripts/dev-db.mjs'], '.')];
await new Promise((resolve) => setTimeout(resolve, 3000));
children.push(run('npx', ['nest', 'start', '--watch'], 'apps/api'));
children.push(run('npx', ['expo', 'start', '--web', '--port', '8081'], 'apps/mobile'));

const stop = () => children.forEach((child) => child.kill('SIGINT'));
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

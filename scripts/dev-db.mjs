// Local MongoDB for development, kept in apps/api/.data. Needs no install:
// it reuses the binary that mongodb-memory-server downloads.
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const require = createRequire(path.join(root, 'apps/api/package.json'));
const { MongoBinary } = require('mongodb-memory-server-core');
const { MongoClient } = require('mongodb');

const PORT = 27018;
const dbPath = path.join(root, 'apps/api/.data/db');
mkdirSync(dbPath, { recursive: true });

const binary = await MongoBinary.getPath();
const mongod = spawn(binary, ['--dbpath', dbPath, '--port', String(PORT), '--bind_ip', '127.0.0.1', '--replSet', 'rs0', '--quiet'], {
  stdio: ['ignore', 'ignore', 'inherit'],
});
mongod.on('exit', (code) => process.exit(code ?? 0));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => mongod.kill(signal));

// Login transactions need a replica set, even with a single node.
const client = new MongoClient(`mongodb://127.0.0.1:${PORT}/?directConnection=true`);
for (let i = 0; ; i++) {
  try {
    await client.connect();
    break;
  } catch (error) {
    if (i === 50) throw error;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}
const admin = client.db('admin');
const status = await admin.command({ replSetGetStatus: 1 }).catch(() => null);
if (!status) await admin.command({ replSetInitiate: { _id: 'rs0', members: [{ _id: 0, host: `127.0.0.1:${PORT}` }] } });
await client.close();
console.log(`MongoDB local: mongodb://127.0.0.1:${PORT}/preachfy?replicaSet=rs0`);

// Local only: marks an account as Pro, standing in for RevenueCat.
// Usage: npm run pro -- email@example.com
import { createRequire } from 'node:module';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const require = createRequire(path.join(root, 'apps/api/package.json'));
const { MongoClient } = require('mongodb');

const email = process.argv[2];
if (!email) throw new Error('Usage: npm run pro -- email@example.com');

const client = await new MongoClient('mongodb://127.0.0.1:27018/preachfy?replicaSet=rs0').connect();
const user = await client.db().collection('user').findOne({ email });
if (!user) throw new Error(`No account for ${email}`);
await client.db().collection('entitlements').updateOne(
  { userId: user._id.toString() },
  { $set: { active: true, expiresAt: null } },
  { upsert: true },
);
await client.close();
console.log(`${email} is Pro on the local database.`);

// Runs the built API against a real in-memory MongoDB and a fake RevenueCat.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http';
import { after, before, test } from 'node:test';
import { MongoClient } from 'mongodb';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

const PORT = 3911;
const API = `http://localhost:${PORT}`;
const ORIGIN = 'http://localhost:8081';
const WEBHOOK = 'test-webhook-secret';

let mongo, client, server, api;
const subscribers = new Map();
const deleted = [];

const mails = [];
const fakeRevenueCat = (req, res) => {
  if (req.url === '/v3/smtp/email') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      mails.push({ key: req.headers['api-key'], ...JSON.parse(body) });
      res.statusCode = 201;
      res.end('{}');
    });
    return;
  }
  const id = decodeURIComponent(req.url.split('/').pop());
  if (req.method === 'DELETE') deleted.push(id);
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify({ subscriber: { entitlements: subscribers.get(id) ?? {} } }));
};

const call = (path, { cookie, method = 'GET', body, headers = {} } = {}) =>
  fetch(API + path, {
    method,
    headers: {
      origin: ORIGIN,
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(cookie ? { cookie } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

async function signUp(email) {
  const res = await call('/api/auth/sign-up/email', {
    method: 'POST',
    body: { email, password: 'correct-horse', name: 'Teste' },
  });
  assert.equal(res.status, 200, await res.clone().text());
  const cookie = res.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
  const { user } = await res.json();
  return { id: user.id, cookie };
}

const webhook = (event, authorization = WEBHOOK) =>
  call('/webhooks/revenuecat', { method: 'POST', body: { event }, headers: { authorization } });

async function makePro(user) {
  subscribers.set(user.id, { preachfy_pro: { expires_date: new Date(Date.now() + 86_400_000).toISOString() } });
  assert.equal((await webhook({ app_user_id: user.id })).status, 200);
}

const sync = (user, since, items) => call('/sync', { cookie: user.cookie, method: 'POST', body: { since, items } });
const mark = (id, updatedAt, note) => ({ kind: 'mark', id, updatedAt, data: { note } });

before(async () => {
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = mongo.getUri('preachfy_test');
  client = await new MongoClient(uri).connect();
  server = http.createServer(fakeRevenueCat);
  await new Promise((resolve) => server.listen(0, resolve));
  api = spawn('node', ['dist/main'], {
    stdio: ['ignore', 'ignore', 'inherit'],
    env: {
      ...process.env,
      PORT: String(PORT),
      DATABASE_URL: uri,
      BETTER_AUTH_SECRET: 'test-secret-with-enough-length-0123456789',
      BETTER_AUTH_URL: API,
      ALLOWED_ORIGINS: ORIGIN,
      REVENUECAT_API_URL: `http://localhost:${server.address().port}`,
      BREVO_API_URL: `http://localhost:${server.address().port}`,
      BREVO_API_KEY: 'brevo-key',
      EMAIL_FROM: 'ola@preachfy.test',
      REVENUECAT_SECRET_KEY: 'sk_test',
      REVENUECAT_WEBHOOK_AUTH: WEBHOOK,
    },
  });
  for (let i = 0; i < 100; i++) {
    const up = await fetch(`${API}/api/auth/ok`).then((r) => r.ok, () => false);
    if (up) return;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('API did not start');
});

after(async () => {
  api?.kill();
  server?.close();
  await client?.close();
  await mongo?.stop();
});

test('routes need a session', async () => {
  assert.equal((await call('/me')).status, 401);
  assert.equal((await call('/sync', { method: 'POST', body: {} })).status, 401);
  assert.equal((await call('/me', { cookie: 'better-auth.session_token=forged' })).status, 401);
});

test('sign up, sign in and wrong password', async () => {
  const user = await signUp('login@example.com');
  const me = await (await call('/me', { cookie: user.cookie })).json();
  assert.equal(me.user.email, 'login@example.com');
  assert.equal(me.pro, false);
  const bad = await call('/api/auth/sign-in/email', { method: 'POST', body: { email: 'login@example.com', password: 'wrong-password' } });
  assert.equal(bad.status, 401);
  const good = await call('/api/auth/sign-in/email', { method: 'POST', body: { email: 'login@example.com', password: 'correct-horse' } });
  assert.equal(good.status, 200);
});

const mailTo = async (email, subject) => {
  for (let i = 0; i < 50; i++) {
    const found = mails.find((m) => m.to[0].email === email && subject.test(m.subject));
    if (found) return found;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return null;
};
const linkIn = (mail) => mail.htmlContent.match(/href="([^"]+)"/)[1].replaceAll('&amp;', '&');

test('a new account gets a confirmation email through Brevo, and the link confirms it', async () => {
  const user = await signUp('confirm@example.com');
  const mail = await mailTo('confirm@example.com', /Confirme/);
  assert.ok(mail, 'email was sent');
  assert.equal(mail.key, 'brevo-key');
  assert.equal(mail.sender.email, 'ola@preachfy.test');
  assert.equal((await (await call('/me', { cookie: user.cookie })).json()).user.emailVerified, false);
  const res = await fetch(linkIn(mail), { redirect: 'manual' });
  assert.ok(res.status < 400, String(res.status));
  assert.equal((await (await call('/me', { cookie: user.cookie })).json()).user.emailVerified, true);
});

test('an unconfirmed account keeps working', async () => {
  const user = await signUp('later@example.com');
  assert.equal((await call('/me', { cookie: user.cookie })).status, 200);
});

test('password recovery changes the password once and ends old sessions', async () => {
  const user = await signUp('reset@example.com');
  const ask = await call('/api/auth/request-password-reset', {
    method: 'POST', body: { email: 'reset@example.com', redirectTo: `${ORIGIN}/reset` }, headers: { 'accept-language': 'es-ES' },
  });
  assert.equal(ask.status, 200, await ask.clone().text());
  const mail = await mailTo('reset@example.com', /contraseña/);
  assert.ok(mail, 'email follows the language of the device');
  const jump = await fetch(linkIn(mail), { redirect: 'manual' });
  const token = new URL(jump.headers.get('location')).searchParams.get('token');
  assert.ok(token);
  const change = () => call('/api/auth/reset-password', { method: 'POST', body: { token, newPassword: 'new-password-1' } });
  assert.equal((await change()).status, 200);
  assert.notEqual((await change()).status, 200, 'a token works once');
  assert.equal((await call('/me', { cookie: user.cookie })).status, 401);
  const signIn = (password) => call('/api/auth/sign-in/email', { method: 'POST', body: { email: 'reset@example.com', password } });
  assert.equal((await signIn('correct-horse')).status, 401);
  assert.equal((await signIn('new-password-1')).status, 200);
});

test('recovery does not reveal who has an account', async () => {
  const before = mails.length;
  const res = await call('/api/auth/request-password-reset', { method: 'POST', body: { email: 'nobody@example.com', redirectTo: `${ORIGIN}/reset` } });
  assert.equal(res.status, 200);
  await new Promise((resolve) => setTimeout(resolve, 300));
  assert.equal(mails.length, before);
});

test('recovery links cannot point to another site', async () => {
  const res = await call('/api/auth/request-password-reset', { method: 'POST', body: { email: 'reset@example.com', redirectTo: 'https://evil.example.com/steal' } });
  assert.notEqual(res.status, 200);
});

test('sync is blocked without Pro', async () => {
  const user = await signUp('free@example.com');
  assert.equal((await sync(user, 0, [])).status, 403);
});

test('webhook rejects a wrong or missing secret and grants nothing', async () => {
  const user = await signUp('forged@example.com');
  subscribers.set(user.id, { preachfy_pro: { expires_date: null } });
  assert.equal((await webhook({ app_user_id: user.id }, 'wrong')).status, 401);
  assert.equal((await call('/webhooks/revenuecat', { method: 'POST', body: { event: { app_user_id: user.id } } })).status, 401);
  assert.equal((await (await call('/me', { cookie: user.cookie })).json()).pro, false);
});

test('webhook grants Pro, and it ends with the subscription', async () => {
  const user = await signUp('pro@example.com');
  await makePro(user);
  assert.equal((await (await call('/me', { cookie: user.cookie })).json()).pro, true);
  subscribers.set(user.id, { preachfy_pro: { expires_date: new Date(Date.now() - 1000).toISOString() } });
  await webhook({ app_user_id: user.id });
  assert.equal((await (await call('/me', { cookie: user.cookie })).json()).pro, false);
  assert.equal((await sync(user, 0, [])).status, 403);
  subscribers.delete(user.id);
  await webhook({ app_user_id: user.id });
  assert.equal((await (await call('/me', { cookie: user.cookie })).json()).pro, false);
});

test('anonymous RevenueCat ids are ignored', async () => {
  assert.equal((await webhook({ app_user_id: '$RCAnonymousID:abc' })).status, 200);
  assert.equal(await client.db().collection('entitlements').countDocuments({ userId: '$RCAnonymousID:abc' }), 0);
});

test('the most recent edit wins and old edits lose', async () => {
  const user = await signUp('lww@example.com');
  await makePro(user);
  const now = Date.now();
  await sync(user, 0, [mark('a', now - 1000, 'new')]);
  await sync(user, 0, [mark('a', now - 5000, 'old')]);
  let items = (await (await sync(user, 0, [])).json()).items;
  assert.deepEqual(items.map((i) => i.data.note), ['new']);
  await sync(user, 0, [mark('a', now - 10, 'newest')]);
  items = (await (await sync(user, 0, [])).json()).items;
  assert.deepEqual(items.map((i) => i.data.note), ['newest']);
});

test('a future device clock cannot lock an item', async () => {
  const user = await signUp('clock@example.com');
  await makePro(user);
  await sync(user, 0, [mark('a', Date.now() + 10 * 365 * 86_400_000, 'future')]);
  await new Promise((resolve) => setTimeout(resolve, 5));
  await sync(user, 0, [mark('a', Date.now(), 'real')]);
  const { items } = await (await sync(user, 0, [])).json();
  assert.deepEqual(items.map((i) => i.data.note), ['real']);
});

test('a second device receives changes through the cursor', async () => {
  const user = await signUp('devices@example.com');
  await makePro(user);
  const first = await (await sync(user, 0, [mark('a', Date.now(), 'one')])).json();
  await new Promise((resolve) => setTimeout(resolve, 5));
  await sync(user, 0, [mark('b', Date.now(), 'two')]);
  const next = await (await sync(user, first.cursor + 1, [])).json();
  assert.deepEqual(next.items.map((i) => i.id), ['b']);
});

test('users never see each other', async () => {
  const one = await signUp('one@example.com');
  const two = await signUp('two@example.com');
  await makePro(one);
  await makePro(two);
  await sync(one, 0, [mark('shared-id', Date.now(), 'private')]);
  const { items } = await (await sync(two, 0, [])).json();
  assert.deepEqual(items, []);
  await sync(two, 0, [mark('shared-id', Date.now() + 1, 'mine')]);
  const back = await (await sync(one, 0, [])).json();
  assert.equal(back.items[0].data.note, 'private');
});

test('invalid sync input is rejected', async () => {
  const user = await signUp('bad@example.com');
  await makePro(user);
  const now = Date.now();
  assert.equal((await sync(user, 0, [{ kind: 'user', id: 'x', updatedAt: now, data: {} }])).status, 400);
  assert.equal((await sync(user, 0, [{ kind: 'mark', id: '', updatedAt: now, data: {} }])).status, 400);
  assert.equal((await sync(user, 0, [{ kind: 'mark', id: 'x', updatedAt: 'soon', data: {} }])).status, 400);
  assert.equal((await sync(user, 0, [mark('x', now, 'y'.repeat(300_000))])).status, 400);
  assert.equal((await sync(user, 0, Array.from({ length: 501 }, (_, i) => mark(`m${i}`, now, '')))).status, 400);
  assert.equal((await sync(user, 0, 'nope')).status, 400);
});

test('deleting the account removes everything', async () => {
  const user = await signUp('delete@example.com');
  await makePro(user);
  await sync(user, 0, [mark('a', Date.now(), 'x')]);
  const wrong = await call('/api/auth/delete-user', { cookie: user.cookie, method: 'POST', body: { password: 'wrong-password' } });
  assert.notEqual(wrong.status, 200);
  assert.equal((await call('/me', { cookie: user.cookie })).status, 200);
  const res = await call('/api/auth/delete-user', { cookie: user.cookie, method: 'POST', body: { password: 'correct-horse' } });
  assert.equal(res.status, 200, await res.clone().text());
  assert.equal((await call('/me', { cookie: user.cookie })).status, 401);
  const db = client.db();
  assert.equal(await db.collection('user').countDocuments({ email: 'delete@example.com' }), 0);
  assert.equal(await db.collection('syncItems').countDocuments({ userId: user.id }), 0);
  assert.equal(await db.collection('entitlements').countDocuments({ userId: user.id }), 0);
  assert.equal(await db.collection('session').countDocuments({ userId: user.id }), 0);
  assert.equal(await db.collection('account').countDocuments({ userId: user.id }), 0);
  assert.ok(deleted.includes(user.id));
  const again = await call('/api/auth/sign-in/email', { method: 'POST', body: { email: 'delete@example.com', password: 'correct-horse' } });
  assert.equal(again.status, 401);
});

test('passwords are not stored in the clear', async () => {
  await signUp('hash@example.com');
  const raw = JSON.stringify(await client.db().collection('account').find().toArray());
  assert.ok(!raw.includes('correct-horse'));
});

test('only allowed origins get credentialed CORS', async () => {
  const allowed = await fetch(`${API}/me`, { headers: { origin: ORIGIN } });
  assert.equal(allowed.headers.get('access-control-allow-origin'), ORIGIN);
  assert.equal(allowed.headers.get('access-control-allow-credentials'), 'true');
  const other = await fetch(`${API}/me`, { headers: { origin: 'https://evil.example' } });
  assert.equal(other.headers.get('access-control-allow-origin'), null);
});

test('only health is public, and the old routes are gone', async () => {
  assert.deepEqual(await (await fetch(`${API}/health`)).json(), { ok: true });
  for (const route of ['/sermons', '/bible', '/community', '/events', '/insights']) {
    assert.equal((await fetch(API + route)).status, 404, route);
  }
});

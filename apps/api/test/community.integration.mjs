// Runs the built API against a real in-memory MongoDB and a fake RevenueCat.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http';
import { after, before, test } from 'node:test';
import { MongoClient } from 'mongodb';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

const PORT = 3912;
const API = `http://localhost:${PORT}`;
const ORIGIN = 'http://localhost:8081';
const WEBHOOK = 'test-webhook-secret';
let mongo, client, server, api, n = 0;
const subscribers = new Map();

const call = (path, { user, method = 'GET', body } = {}) =>
  fetch(API + path, {
    method,
    headers: { origin: ORIGIN, ...(body ? { 'content-type': 'application/json' } : {}), ...(user ? { cookie: user.cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
const json = async (res, status = 200) => {
  const text = await res.text();
  assert.equal(res.status, status, text);
  return text ? JSON.parse(text) : null;
};

async function signUp(name) {
  const res = await call('/api/auth/sign-up/email', { method: 'POST', body: { email: `u${n++}@example.com`, password: 'correct-horse', name } });
  assert.equal(res.status, 200);
  const cookie = res.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
  return { id: (await res.json()).user.id, cookie, name };
}
async function proUser(name) {
  const user = await signUp(name);
  subscribers.set(user.id, { preachfy_pro: { expires_date: null } });
  const res = await fetch(`${API}/webhooks/revenuecat`, {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: WEBHOOK }, body: JSON.stringify({ event: { app_user_id: user.id } }),
  });
  assert.equal(res.status, 200);
  return user;
}
async function group(name = 'Célula') {
  const leader = await proUser('Líder');
  const member = await signUp('Membro');
  const { id, inviteCode } = await json(await call('/communities', { user: leader, method: 'POST', body: { name } }), 201);
  await json(await call('/communities/join', { user: member, method: 'POST', body: { code: inviteCode } }));
  return { id, inviteCode, leader, member };
}
const post = async (id, user, body) => (await json(await call(`/communities/${id}/posts`, { user, method: 'POST', body }), 201)).id;
const feed = (id, user) => call(`/communities/${id}/posts`, { user }).then(json);

const classBody = {
  title: 'Aula', goal: 'Confiar', context: { label: 'Salmos 23', body: 'texto' },
  steps: [
    { id: 'a', title: 'Um', label: 'Sl 23:1', body: 'corpo 1', question: 'O que falta?', notes: 'SECRETO', expectedAnswer: 'SECRETO' },
    { id: 'b', title: 'Dois', label: '', body: 'corpo 2' },
    { id: 'c', title: 'Três', label: '', body: 'corpo 3' },
  ],
};
const newClass = async (teacher) => (await json(await call('/live', { user: teacher, method: 'POST', body: classBody }), 201)).code;

before(async () => {
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = mongo.getUri('preachfy_test');
  client = await new MongoClient(uri).connect();
  server = http.createServer((req, res) => {
    const id = decodeURIComponent(req.url.split('/').pop());
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ subscriber: { entitlements: subscribers.get(id) ?? {} } }));
  });
  await new Promise((resolve) => server.listen(0, resolve));
  api = spawn('node', ['dist/main'], {
    stdio: ['ignore', 'ignore', 'inherit'],
    env: {
      ...process.env, PORT: String(PORT), DATABASE_URL: uri, BETTER_AUTH_SECRET: 'test-secret-with-enough-length-0123456789',
      BETTER_AUTH_URL: API, ALLOWED_ORIGINS: ORIGIN, REVENUECAT_API_URL: `http://localhost:${server.address().port}`,
      REVENUECAT_SECRET_KEY: 'sk_test', REVENUECAT_WEBHOOK_AUTH: WEBHOOK,
    },
  });
  for (let i = 0; i < 100; i++) {
    if (await fetch(`${API}/api/auth/ok`).then((r) => r.ok, () => false)) return;
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

test('a community needs a session to read and Pro to create; joining is free', async () => {
  assert.equal((await call('/communities')).status, 401);
  const free = await signUp('Grátis');
  assert.equal((await call('/communities', { user: free, method: 'POST', body: { name: 'x' } })).status, 403);
  const { id, member } = await group();
  const list = await call('/communities', { user: member }).then(json);
  assert.deepEqual(list.map((c) => [c.id, c.role, c.memberCount]), [[id, 'member', 2]]);
});

test('someone outside cannot read or tell it exists', async () => {
  const { id } = await group();
  const stranger = await signUp('Estranho');
  for (const path of ['', '/posts', '/events', '/reports']) {
    assert.equal((await call(`/communities/${id}${path}`, { user: stranger })).status, 404, path);
  }
  assert.equal((await call(`/communities/${id}/posts`, { user: stranger, method: 'POST', body: { text: 'oi' } })).status, 404);
  assert.equal((await call('/communities/join', { user: stranger, method: 'POST', body: { code: 'NOPE' } })).status, 404);
});

test('only leaders see the invite, and rotating cancels the old one', async () => {
  const { id, inviteCode, leader, member } = await group();
  assert.equal((await call(`/communities/${id}`, { user: member }).then(json)).inviteCode, null);
  assert.equal((await call(`/communities/${id}/invite`, { user: member, method: 'POST' })).status, 403);
  const { inviteCode: fresh } = await call(`/communities/${id}/invite`, { user: leader, method: 'POST' }).then(json);
  assert.notEqual(fresh, inviteCode);
  const late = await signUp('Atrasado');
  assert.equal((await call('/communities/join', { user: late, method: 'POST', body: { code: inviteCode } })).status, 404);
  await json(await call('/communities/join', { user: late, method: 'POST', body: { code: fresh.toLowerCase() } }));
});

test('member details do not expose emails', async () => {
  const { id, member } = await group();
  const detail = await call(`/communities/${id}`, { user: member }).then(json);
  assert.doesNotMatch(JSON.stringify(detail), /@example\.com/);
});

test('notices are for leaders, and seen counts once per person', async () => {
  const { id, leader, member } = await group();
  assert.equal((await call(`/communities/${id}/posts`, { user: member, method: 'POST', body: { text: 'x', kind: 'notice' } })).status, 403);
  const postId = await post(id, leader, { text: 'Ensaio sábado', kind: 'notice' });
  for (let i = 0; i < 2; i++) await json(await call(`/communities/${id}/posts/${postId}/seen`, { user: member, method: 'POST' }));
  const [first] = await feed(id, member);
  assert.equal(first.seenCount, 1);
  assert.equal(first.seenByMe, true);
});

test('authors and leaders delete posts; other members cannot', async () => {
  const { id, leader, member } = await group();
  const other = await signUp('Outro');
  const { inviteCode } = await call(`/communities/${id}`, { user: leader }).then(json);
  await json(await call('/communities/join', { user: other, method: 'POST', body: { code: inviteCode } }));
  const postId = await post(id, member, { text: 'meu' });
  assert.equal((await call(`/communities/${id}/posts/${postId}`, { user: other, method: 'DELETE' })).status, 403);
  await json(await call(`/communities/${id}/posts/${postId}`, { user: leader, method: 'DELETE' }));
  assert.equal((await feed(id, member)).length, 0);
});

test('a report reaches leaders, and blocking hides the author for me only', async () => {
  const { id, leader, member } = await group();
  const postId = await post(id, leader, { text: 'ofensivo' });
  await json(await call(`/communities/${id}/posts/${postId}/report`, { user: member, method: 'POST', body: { reason: 'abuso' } }));
  assert.equal((await call(`/communities/${id}/reports`, { user: member })).status, 403);
  const reports = await call(`/communities/${id}/reports`, { user: leader }).then(json);
  assert.deepEqual(reports.map((r) => [r.postId, r.reason]), [[postId, 'abuso']]);
  await json(await call('/blocks', { user: member, method: 'POST', body: { userId: leader.id } }));
  assert.equal((await feed(id, member)).length, 0);
  assert.equal((await feed(id, leader)).length, 1);
  await json(await call(`/blocks/${leader.id}`, { user: member, method: 'DELETE' }));
  assert.equal((await feed(id, member)).length, 1);
});

test('the owner cannot be removed; members can leave; only leaders remove others', async () => {
  const { id, leader, member } = await group();
  assert.equal((await call(`/communities/${id}/members/${leader.id}`, { user: member, method: 'DELETE' })).status, 403);
  assert.equal((await call(`/communities/${id}/members/${leader.id}`, { user: leader, method: 'DELETE' })).status, 403);
  await json(await call(`/communities/${id}/members/${member.id}`, { user: member, method: 'DELETE' }));
  assert.equal((await call(`/communities/${id}`, { user: member })).status, 404);
});

test('only the owner promotes a member, who then can moderate', async () => {
  const { id, leader, member } = await group();
  assert.equal((await call(`/communities/${id}/members/${member.id}`, { user: member, method: 'PATCH', body: { role: 'leader' } })).status, 403);
  await json(await call(`/communities/${id}/members/${member.id}`, { user: leader, method: 'PATCH', body: { role: 'leader' } }));
  await post(id, member, { text: 'aviso', kind: 'notice' });
});

test('agenda: leaders schedule, members confirm, links must be web addresses', async () => {
  const { id, leader, member } = await group();
  const startsAt = Date.now() + 86_400_000;
  const event = { title: 'Culto', startsAt, meetLink: 'https://meet.example.com/x' };
  assert.equal((await call(`/communities/${id}/events`, { user: member, method: 'POST', body: event })).status, 403);
  assert.equal((await call(`/communities/${id}/events`, { user: leader, method: 'POST', body: { ...event, meetLink: 'javascript:alert(1)' } })).status, 400);
  const created = await json(await call(`/communities/${id}/events`, { user: leader, method: 'POST', body: event }), 201);
  await json(await call(`/communities/${id}/events/${created.id}/rsvp`, { user: member, method: 'POST', body: { going: true } }));
  const [seen] = await call(`/communities/${id}/events`, { user: member }).then(json);
  assert.deepEqual([seen.goingCount, seen.goingByMe], [1, true]);
  await json(await call(`/communities/${id}/events/${created.id}/rsvp`, { user: member, method: 'POST', body: { going: false } }));
  assert.equal((await call(`/communities/${id}/events`, { user: member }).then(json))[0].goingCount, 0);
});

test('a shared study can be copied by members', async () => {
  const { id, leader, member } = await group();
  await post(id, leader, { text: '', attachment: { title: 'Salmo 23', study: { steps: [] } } });
  const [first] = await feed(id, member);
  assert.deepEqual(first.attachment, { title: 'Salmo 23', study: { steps: [] } });
});

test('deleting an account removes its communities and its posts elsewhere', async () => {
  const { id, leader, member } = await group();
  const otherGroup = await group('Outra');
  const { inviteCode } = await call(`/communities/${otherGroup.id}`, { user: otherGroup.leader }).then(json);
  await json(await call('/communities/join', { user: leader, method: 'POST', body: { code: inviteCode } }));
  await post(otherGroup.id, leader, { text: 'vou sair' });
  const res = await call('/api/auth/delete-user', { user: leader, method: 'POST', body: { password: 'correct-horse' } });
  assert.equal(res.status, 200, await res.clone().text());
  assert.equal((await call(`/communities/${id}`, { user: member })).status, 404);
  assert.equal((await feed(otherGroup.id, otherGroup.leader)).length, 0);
  assert.equal(await client.db().collection('communityMembers').countDocuments({ userId: leader.id }), 0);
});

test('starting a class needs Pro; the student needs no account', async () => {
  const free = await signUp('Grátis');
  assert.equal((await call('/live', { user: free, method: 'POST', body: classBody })).status, 403);
  assert.equal((await call('/live', { method: 'POST', body: classBody })).status, 401);
  const code = await newClass(await proUser('Prof'));
  assert.match(code, /^[A-Z2-9]{6}$/);
  const view = await call(`/live/${code.toLowerCase()}`).then(json);
  assert.equal(view.title, 'Aula');
});

test('private fields sent by mistake are never stored or published', async () => {
  const code = await newClass(await proUser('Prof'));
  const stored = await client.db().collection('liveSessions').findOne({ _id: code });
  assert.doesNotMatch(JSON.stringify(stored), /SECRETO/);
});

test('students see the goal first, then only what the teacher reached, then everything', async () => {
  const teacher = await proUser('Prof');
  const code = await newClass(teacher);
  let view = await call(`/live/${code}`).then(json);
  assert.deepEqual([view.steps.length, view.goal, view.context.body, view.total], [0, 'Confiar', 'texto', 3]);
  await json(await call(`/live/${code}/state`, { user: teacher, method: 'POST', body: { current: 1 } }));
  view = await call(`/live/${code}`).then(json);
  assert.deepEqual(view.steps.map((s) => s.title), ['Um', 'Dois']);
  await json(await call(`/live/${code}/end`, { user: teacher, method: 'POST', body: { closing: 'Desafio' } }));
  view = await call(`/live/${code}`).then(json);
  assert.deepEqual([view.steps.length, view.closing, view.ended], [3, 'Desafio', true]);
});

test('only the owner drives the class or reads answers', async () => {
  const code = await newClass(await proUser('Prof'));
  const other = await proUser('Intruso');
  assert.equal((await call(`/live/${code}/state`, { user: other, method: 'POST', body: { current: 1 } })).status, 404);
  assert.equal((await call(`/live/${code}/state`, { method: 'POST', body: { current: 1 } })).status, 401);
  assert.equal((await call(`/live/${code}/answers?step=a`, { user: other })).status, 404);
  assert.equal((await call(`/live/${code}/end`, { user: other, method: 'POST', body: {} })).status, 404);
});

test('an answer can be changed, is shown without a name, and stops when the class ends', async () => {
  const teacher = await proUser('Prof');
  const code = await newClass(teacher);
  const send = (text) => call(`/live/${code}/answers`, { method: 'POST', body: { participantId: 'p1', nickname: 'Ana', stepId: 'a', text } });
  await json(await send('primeira'));
  await json(await send('corrigida'));
  const list = await call(`/live/${code}/answers?step=a`, { user: teacher }).then(json);
  assert.deepEqual(list.map((a) => [a.nickname, a.text]), [['Ana', 'corrigida']]);
  await json(await call(`/live/${code}/highlight`, { user: teacher, method: 'POST', body: { answerId: list[0].id } }));
  const view = await call(`/live/${code}`).then(json);
  assert.equal(view.highlight, 'corrigida');
  assert.doesNotMatch(JSON.stringify(view), /Ana/);
  await json(await call(`/live/${code}/end`, { user: teacher, method: 'POST', body: {} }));
  assert.equal((await send('tarde')).status, 409);
});

test('the teacher controls the screen, and a verse can go up outside the outline', async () => {
  const teacher = await proUser('Prof');
  const code = await newClass(teacher);
  const other = await proUser('Intruso');
  const body = { blank: true, background: 'night', dim: 99 };
  assert.equal((await call(`/live/${code}/screen`, { user: other, method: 'POST', body })).status, 404);
  assert.equal((await call(`/live/${code}/screen`, { user: teacher, method: 'POST', body: { background: 'http://evil' } })).status, 400);
  await json(await call(`/live/${code}/screen`, { user: teacher, method: 'POST', body }));
  let view = await call(`/live/${code}`).then(json);
  assert.deepEqual([view.blank, view.background, view.dim], [true, 'night', 85]);
  await json(await call(`/live/${code}/highlight`, { user: teacher, method: 'POST', body: { text: 'João 3:16' } }));
  view = await call(`/live/${code}`).then(json);
  assert.equal(view.highlight, 'João 3:16');
  await json(await call(`/live/${code}/highlight`, { user: teacher, method: 'POST', body: {} }));
  assert.equal((await call(`/live/${code}`).then(json)).highlight, null);
});

test('answers go only to steps that ask a question', async () => {
  const code = await newClass(await proUser('Prof'));
  const res = await call(`/live/${code}/answers`, { method: 'POST', body: { participantId: 'p', stepId: 'b', text: 'x' } });
  assert.equal(res.status, 400);
});

test('an expired class is gone', async () => {
  const code = await newClass(await proUser('Prof'));
  await client.db().collection('liveSessions').updateOne({ _id: code }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
  assert.equal((await call(`/live/${code}`)).status, 404);
});

test('a flood of answers is limited', async () => {
  const code = await newClass(await proUser('Prof'));
  const statuses = [];
  for (let i = 0; i < 40; i++) {
    const batch = await Promise.all(Array.from({ length: 10 }, (_, j) =>
      call(`/live/${code}/answers`, { method: 'POST', body: { participantId: `p${i}-${j}`, stepId: 'a', text: 'x' } })));
    statuses.push(...batch.map((r) => r.status));
  }
  assert.ok(statuses.includes(429));
});

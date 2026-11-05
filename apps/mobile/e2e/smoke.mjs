// Browser smoke test. Needs `npm run dev` running. Run: npm run e2e -w @preachfy/mobile
import { chromium } from 'playwright';

const WEB = process.env.WEB_URL ?? 'http://localhost:8081';
const results = [];
const ok = (name, condition, detail = '') => {
  results.push(Boolean(condition));
  console.log(condition ? 'ok  ' : 'FAIL', name, detail);
};

const browser = await chromium.launch();
const errors = [];
const page = await (await browser.newContext({ viewport: { width: 393, height: 852 }, locale: 'pt-BR' })).newPage();
page.on('pageerror', (e) => errors.push(e.message));
page.setDefaultTimeout(30000);
const T = (id) => page.getByTestId(id);

try {
  await page.goto(WEB);
  await T('today').waitFor({ timeout: 120000 });
  ok('Today opens', true);

  // A new visitor reaches the paywall from a Pro feature, and the dev shortcut signs in, unlocks Pro and opens a study.
  await page.goto(`${WEB}/create`);
  await T('new-study').click();
  await T('paywall').waitFor();
  ok('Pro feature shows the paywall', true);

  await page.goto(`${WEB}/dev`);
  await T('study').waitFor({ timeout: 60000 });
  ok('dev shortcut signs in and opens a ready study', true);
  ok('study is ready to deliver', await T('ready').isVisible());
  ok('steps show their base text', /Salmo|Psalm/i.test(await T('step-1').innerText()));

  await T('step-1-toggle').click();
  await T('step-1-notes').fill('Nota editada');
  await page.waitForTimeout(400);
  await page.reload();
  await T('study').waitFor();
  await T('step-1-toggle').click();
  ok('an edit survives a reload', (await T('step-1-notes').inputValue()) === 'Nota editada');

  // Prepare: three stages, one at a time.
  await page.goto(`${WEB}/new`);
  await T('passage-ok').waitFor();
  ok('stage 1 shows the passage and the verses', (await page.getByTestId(/^pick-\d+$/).count()) === 6);
  await T('pick-2').click();
  await T('pick-4').click();
  await page.waitForTimeout(300);
  ok('tapping verses chooses the passage', /2–4/.test(await T('passage-ok').innerText()), await T('passage-ok').innerText());
  await T('whole-chapter').click();
  await page.waitForTimeout(300);
  ok('whole chapter restores it', /1–6/.test(await T('passage-ok').innerText()));
  await T('wiz-continue').click();
  await T('kind-outline').waitFor();
  ok('stage 2 asks for the type', await T('kind-class').isVisible());
  await T('kind-outline').click();
  await T('sections-count').waitFor();
  const before = await page.getByTestId(/^draft-\d+$/).count();
  ok('stage 3 shows the steps', before >= 5);
  ok('steps show no boilerplate description', !/Uma afirmação curta/.test(await T('draft-1').innerText()));
  await T('draft-add').click();
  await T('draft-add').click();
  await page.waitForTimeout(300);
  ok('points can be added freely', (await page.getByTestId(/^draft-\d+$/).count()) === before + 2);
  ok('a new point continues the numbering', (await T(`draft-title-${before}`).inputValue()) === 'Ponto 4', await T(`draft-title-${before}`).inputValue());
  await T(`draft-remove-${before}`).click();
  await T(`draft-remove-${before}`).click();
  await page.waitForTimeout(300);
  ok('points can be removed', (await page.getByTestId(/^draft-\d+$/).count()) === before);
  await T('wiz-2').click();
  await T('kind-class').click();
  await T('create-study').click();
  await T('study').waitFor();
  ok('Create builds a class from the passage', true);

  // Today leads with what to do next.
  await page.goto(WEB);
  await T('next-card').waitFor();
  ok('Today shows the next content with its progress', (await T('next-title').innerText()).length > 0 && (await T('segments').count()) > 0);
  await T('next-cta').click();
  await page.waitForTimeout(500);
  ok('the next step opens the content', /\/(study|pulpit)\//.test(page.url()), page.url());

  // The Pulpit opens on a checklist, then starts.
  await page.goto(`${WEB}/pulpit?id=demo`);
  await T('prepare').waitFor();
  ok('Pulpit checklist is ready', (await T('check-text').isVisible()) && (await T('start').isEnabled()));
  await T('start').click();
  await T('step-title').waitFor();
  ok('Pulpit starts on the first step', true);

  // From a selection in the Bible, the passage is already chosen.
  await page.goto(`${WEB}/bible`);
  await T('word-4-2').dblclick();
  await T('create-from-selection').click();
  await T('kind-outline').waitFor();
  ok('Prepare from the Bible skips the passage stage', /Salmos 23:4/.test(await T('passage-summary').innerText()), await T('passage-summary').innerText());

  await page.goto(`${WEB}/bible`);
  await T('word-1-1').dblclick();
  await T('selection-bar').waitFor();
  ok('double tap selects a word', true);

  ok('no page errors', errors.length === 0, errors[0] ?? '');
} catch (error) {
  console.log('ERROR', String(error.message).slice(0, 300));
  results.push(false);
} finally {
  await browser.close();
}
console.log(`${results.filter(Boolean).length}/${results.length}`);
process.exit(results.every(Boolean) ? 0 : 1);

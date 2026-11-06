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

  // Time: a target, a bar and an estimate from the words written.
  const target = async () => Number(await T('target').innerText());
  const before0 = await target();
  await T('target-more').click();
  await page.waitForTimeout(200);
  ok('the target can be raised', (await target()) === before0 + 5, `${before0} -> ${await target()}`);
  ok('the plan is compared with the target', /min planejados/.test(await T('budget-note').innerText()), await T('budget-note').innerText());

  // Blocks: each step is a sequence of things to say.
  await T('step-1-toggle').click();
  await T('step-1-block-0-text').fill('Nota editada');
  await T('step-1-add-idea').click();
  await T('step-1-block-1-text').waitFor();
  await T('step-1-block-1-text').fill(Array.from({ length: 260 }, () => 'palavra').join(' '));
  await page.waitForTimeout(300);
  ok('blocks can be added', (await page.getByTestId(/^step-1-block-\d+$/).count()) === 2);
  ok('the speech time comes from the words', /260 palavras/.test(await T('step-1-block-1-estimate').innerText()) && /2 min/.test(await T('step-1-block-1-estimate').innerText()), await T('step-1-block-1-estimate').innerText());
  await T('step-1-add-activity').click();
  await T('step-1-block-2-minutes').waitFor();
  ok('an activity has its own minutes', (await T('step-1-block-2-minutes').inputValue()) === '5');
  await T('step-1-block-2-remove').click();
  await T('step-1-block-1-up').click();
  await page.waitForTimeout(200);
  ok('blocks reorder', (await T('step-1-block-0-text').inputValue()).split(' ').length === 260);
  await page.waitForTimeout(300);
  await page.reload();
  await T('study').waitFor();
  await T('step-1-toggle').click();
  ok('an edit survives a reload', (await T('step-1-block-1-text').inputValue()) === 'Nota editada');

  // The Pulpit leads block by block.
  await T('open-pulpit').click();
  await T('prepare').waitFor();
  await T('start').click();
  await T('step-title').waitFor();
  const firstTitle = await T('step-title').innerText();
  ok('the Pulpit shows the base text and the blocks together', (await T('base-text').isVisible()) && (await T('block-text').first().isVisible()));
  await T('next').click();
  await page.waitForTimeout(250);
  ok('next moves straight to the next step', (await T('step-title').innerText()) !== firstTitle);
  await T('prev').click();
  await page.waitForTimeout(250);
  ok('going back returns to the previous step', (await T('step-title').innerText()) === firstTitle);
  await page.goBack();
  await T('study').waitFor().catch(() => {});

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
  ok('stage 2 asks what will be prepared', await T('kind-class').isVisible());
  await T('kind-class').click();
  await T('study').waitFor();
  ok('the message starts with an introduction and a conclusion', (await page.getByTestId(/^step-\d+-toggle$/).count()) === 2 && (await T('step-0-block-0-text').inputValue()) === '');
  ok('the theme is called theme of the message', /tema da mensagem|objetivo da aula/i.test(await page.locator('body').innerText()));
  await T('add-step').click();
  await page.waitForTimeout(300);
  ok('a new step goes before the conclusion', (await page.getByTestId(/^step-\d+-toggle$/).count()) === 3 && /Conclus/.test(await T('step-2-toggle').innerText()));
  await T('step-0-toggle').click();
  await T('step-0-block-0-text').fill('Primeira ideia');
  await page.waitForTimeout(300);
  ok('what is written becomes the first note', (await T('step-0-block-0-text').inputValue()) === 'Primeira ideia');
  ok('there is no Full, Outline or Keys choice', (await page.getByText('Outline').count()) === 0 && (await page.getByText('Tópicos').count()) === 0);

  // A sermon is not a class, and Pregar is never locked.
  await page.goto(`${WEB}/new`);
  await T('passage-ok').waitFor();
  await T('wiz-continue').click();
  await T('kind-outline').click();
  await T('study').waitFor();
  ok('Pregar is available even with the step still empty', await T('open-pulpit').isEnabled());
  ok('a sermon offers the screen, not a class', /telão/i.test(await T('open-live').innerText()) && !/aula/i.test(await T('open-live').innerText()), await T('open-live').innerText());
  await T('open-pulpit').click();
  await T('prepare').waitFor();
  ok('the checklist informs without blocking', await T('start').isEnabled());
  await T('start').click();
  await T('step-title').waitFor();
  ok('a step with nothing written still opens', true);
  await page.goBack();

  // Today leads with what to do next.
  await page.goto(WEB);
  await T('next-card').waitFor();
  ok('Today shows the next content with its progress', (await T('next-title').innerText()).length > 0 && (await T('segments').count()) > 0);
  await T('next-cta').click();
  await page.waitForTimeout(500);
  ok('the next step opens the content', /\/(study|pulpit)[/?]/.test(page.url()), page.url());

  // The Pulpit opens on a checklist, then starts.
  await page.goto(`${WEB}/pulpit?id=demo`);
  await T('prepare').waitFor();
  ok('Pulpit checklist is ready', (await T('check-text').isVisible()) && (await T('start').isEnabled()));
  await T('start').click();
  await T('step-title').waitFor();
  ok('Pulpit starts on the first step', true);

  // The Bible version is chosen from a menu.
  await page.goto(`${WEB}/bible`);
  await T('word-1-1').waitFor();
  await T('translation').click();
  await T('version-menu').waitFor();
  ok('the version menu lists every translation', (await page.locator('[data-testid^=version-]').count()) >= 5);
  await T('version-kjv').click();
  await page.waitForTimeout(400);
  ok('choosing a version changes the text', /KJV/.test(await T('translation').innerText()));

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

  // A highlight takes a note (free), and tapping the highlight opens it again.
  await T('cat-promessa').click();
  await T('mark-sheet').waitFor();
  await T('mark-note-input').fill('Deus cuida de mim');
  await T('mark-done').click();
  await page.waitForTimeout(300);
  ok('a highlighted verse shows a note marker', await T('note-1').isVisible());
  await T('word-1-1').click();
  await T('mark-sheet').waitFor();
  ok('tapping the highlight opens its note', (await T('mark-note-input').inputValue()) === 'Deus cuida de mim');
  await T('mark-done').click();

  // Comparing: each version has its own color and a dropdown.
  await page.goto(`${WEB}/compare`);
  await T('compare-1').waitFor();
  const rightBefore = await T('compare-right').innerText();
  await T('compare-right').click();
  await T('compare-version-menu').waitFor();
  await page.locator('[data-testid^=compare-version-]').filter({ hasNot: page.getByTestId('compare-version-menu') }).nth(2).click();
  await page.waitForTimeout(400);
  ok('comparison picks versions from a dropdown', (await T('compare-right').innerText()) !== rightBefore);

  ok('no page errors', errors.length === 0, errors[0] ?? '');
} catch (error) {
  console.log('ERROR', String(error.message).slice(0, 300));
  results.push(false);
} finally {
  await browser.close();
}
console.log(`${results.filter(Boolean).length}/${results.length}`);
process.exit(results.every(Boolean) ? 0 : 1);

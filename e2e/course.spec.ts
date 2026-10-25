import { expect, test, type Page } from '@playwright/test';
import { compile } from '../build/compile.ts';
import { load } from '../build/content.ts';
import { dirFS } from '../build/fs.ts';

const { index, lessons } = compile(load(dirFS('content')));
const LESSON = '01-present-past/00-present-tenses';
const META = index.lessons[LESSON]!;
// Lessons of the B1 → B2 level, where LESSON is.
const B2_LESSONS = index.modules.filter((m) => m.level === 'b2').reduce((n, m) => n + m.lessons.length, 0);

/** Answers every item of the exercise on screen correctly. */
async function solve(page: Page, exID: string) {
  const ex = lessons.get(LESSON)!.exercises.find((e) => e.id === exID)!;
  const items = page.locator('.item');
  await expect(items).toHaveCount(ex.items.length);
  for (const [i, it] of ex.items.entries()) {
    const item = items.nth(i);
    if (it.choice) await item.locator('input[type=radio]').nth(it.answer).check();
    else await item.locator('input.answer').fill(it.answers[0]!);
  }
  await page.getByRole('button', { name: '✓ Проверить' }).click();
  await expect(page.getByText(`${ex.items.length} из ${ex.items.length} — засчитано`)).toBeVisible();
}

test('a lesson from theory to the next one', async ({ page }) => {
  await page.goto('lesson/' + LESSON);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(META.title);

  // A quiz in the theory answers on the spot.
  const quiz = page.locator('.quiz').first();
  await quiz.locator('.quiz-opt[data-correct="true"]').click();
  await expect(quiz.locator('.quiz-explain')).toBeVisible();

  await page.getByRole('link', { name: 'Перейти к практике →' }).click();
  await expect(page).toHaveURL(new RegExp(`practice/${LESSON}\\?ex=`));

  const ids = lessons.get(LESSON)!.exercises.map((e) => e.id);
  for (const [i, id] of ids.entries()) {
    await expect(page).toHaveURL(new RegExp(`ex=${id}`));
    await solve(page, id);
    if (i < ids.length - 1) await page.getByRole('link', { name: 'Следующее упражнение →' }).click();
  }
  await page.getByRole('button', { name: 'Завершить урок →' }).click();
  await expect(page).toHaveURL(new RegExp(`lesson/${META.next}$`));

  // Progress survives a reload: it is in IndexedDB.
  await page.goto('./');
  await page.reload();
  await expect(page.getByText(`Пройдено уроков: 1 из ${B2_LESSONS}`)).toBeVisible();
  await expect(page.locator('.lessons li.done')).toHaveCount(1);

  // The finished lesson unlocked its cards.
  await page.goto('review');
  await page.getByRole('button', { name: 'Показать ответ' }).click();
  await page.getByRole('button', { name: 'Помню', exact: true }).click();
  await expect(page.getByText(/Осталось на сегодня|всё повторено/)).toBeVisible();

  await page.goto('progress');
  await expect(page.locator('.stat-n').first()).toHaveText(`1/${B2_LESSONS}`);
});

test('a wrong answer is explained, a contraction is accepted', async ({ page }) => {
  const ex = lessons.get(LESSON)!.exercises.find((e) => e.items.filter((it) => !it.choice).length >= 2)!;
  const [i, j] = ex.items.flatMap((it, k) => (it.choice ? [] : [k]));
  await page.goto(`practice/${LESSON}?ex=${ex.id}`);
  const wrong = page.locator('.item').nth(i!);
  await wrong.locator('input.answer').fill('zzz');
  const right = page.locator('.item').nth(j!);
  await right.locator('input.answer').fill(ex.items[j!]!.answers[0]!.toUpperCase());
  await page.getByRole('button', { name: '✓ Проверить' }).click();
  await expect(wrong).toHaveClass(/bad/);
  await expect(wrong.getByText('Правильно:')).toBeVisible();
  await expect(right).toHaveClass(/ok/);
});

test('answers are kept as a draft', async ({ page }) => {
  const ex = lessons.get(LESSON)!.exercises.find((e) => e.items.some((it) => !it.choice))!;
  const i = ex.items.findIndex((it) => !it.choice);
  await page.goto(`practice/${LESSON}?ex=${ex.id}`);
  await page.locator('.item').nth(i).locator('input.answer').fill('draft');
  await page.waitForTimeout(1000);
  await page.reload();
  await expect(page.locator('.item').nth(i).locator('input.answer')).toHaveValue('draft');
});

test('progress moves between devices as a file', async ({ page }) => {
  await page.goto('lesson/' + LESSON);
  await page.goto('progress');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: '⬇ Сохранить в файл' }).click();
  const file = await (await download).path();
  const text = (await import('node:fs')).readFileSync(file, 'utf8');
  expect(JSON.parse(text)).toMatchObject({ app: 'englingo', version: 1 });

  const data = JSON.parse(text);
  data.lessonsDone = { [LESSON]: Date.now() };
  page.once('dialog', (d) => d.accept());
  await page.locator('input[type=file]').setInputFiles({ name: 'p.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data)) });
  await expect(page.getByText('Прогресс загружен')).toBeVisible();
  await expect(page.locator('.stat-n').first()).toHaveText(`1/${B2_LESSONS}`);
});

test('deep links, the level switch and unknown pages', async ({ page }) => {
  await page.goto(`practice/${LESSON}?ex=nope`);
  await expect(page.getByRole('heading', { name: 'Нет такой страницы' })).toBeVisible();
  await page.goto('./?level=c1');
  await expect(page.getByRole('heading', { level: 2, name: /B2 → C1/ })).toBeVisible();
  await expect(page).toHaveURL(/\/englingo\/$/);
  await page.reload();
  await expect(page.getByRole('heading', { level: 2, name: /B2 → C1/ })).toBeVisible();
  await page.locator('.level-pill', { hasText: 'B1 → B2' }).click();
  await expect(page.getByRole('heading', { level: 2, name: /B1 → B2/ })).toBeVisible();
});

test('the whole course works offline once installed', async ({ page, context, browserName }, info) => {
  test.skip(info.project.name !== 'desktop' || browserName !== 'chromium', 'one browser is enough');
  await page.goto('./');
  await page.evaluate(() => navigator.serviceWorker.ready);
  // The first visit is not controlled yet; the next one is, with everything precached.
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);

  // A lesson never opened before: its chunk comes from the precache.
  await page.goto('lesson/' + [...lessons.keys()].at(-1));
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('.lesson p').first()).toBeVisible();

  await page.goto(`practice/${LESSON}`);
  await solve(page, lessons.get(LESSON)!.exercises[0]!.id);
});

test('a listening exercise plays its recording and shows the transcript once checked', async ({ page }) => {
  const id = [...lessons.values()].flatMap((l) => l.exercises).find((e) => e.type === 'listening' && e.audio)?.id;
  test.skip(!id, 'no listening exercise with local audio');
  const lesson = [...lessons.values()].find((l) => l.exercises.some((e) => e.id === id))!;
  await page.goto(`practice/${lesson.id}?ex=${id}`);
  const player = page.locator('audio.player').first();
  await expect(player).toHaveAttribute('src', /\/audio\/.+\.mp3$/);
  const src = await player.getAttribute('src');
  expect((await page.request.get(src!)).status()).toBe(200);
  await expect(page.locator('details.transcript')).toHaveCount(0);
  await page.getByRole('button', { name: '✓ Проверить' }).click();
  await expect(page.locator('details.transcript')).toHaveCount(1);
});

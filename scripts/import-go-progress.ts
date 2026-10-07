// Moves progress from the Go version of Englingo (SQLite, ~/.englingo/progress.db)
// into a progress file: open the app's «Прогресс» page → «Загрузить из файла».
//
//	node scripts/import-go-progress.ts [progress.db] [out.json]
import { writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { emptyProgress } from '../src/course/progress.ts';

const [src = join(homedir(), '.englingo', 'progress.db'), out = 'englingo-progress.json'] = process.argv.slice(2);
const db = new DatabaseSync(src, { readOnly: true });
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- columns as the Go schema declares them
const rows = (sql: string) => db.prepare(sql).all() as any[];
const ms = (sec: number) => sec * 1000;
// The Go version wrote JSON columns as blobs.
const json = (v: string | Uint8Array) => JSON.parse(typeof v === 'string' ? v : new TextDecoder().decode(v));

const p = emptyProgress();
for (const r of rows('SELECT lesson_id, done_at FROM lessons_done')) p.lessonsDone[r.lesson_id] = ms(r.done_at);
for (const r of rows('SELECT exercise_id, answers, results, passed, at FROM attempts ORDER BY id')) {
  p.attempts.push({ ex: r.exercise_id, answers: json(r.answers), results: json(r.results), passed: r.passed === 1, at: ms(r.at) });
}
for (const r of rows('SELECT exercise_id, text FROM drafts')) p.drafts[r.exercise_id] = r.text;
for (const r of rows('SELECT id, exercise_id, text, words, checked, at FROM writings ORDER BY id')) {
  p.writings.push({ id: r.id, ex: r.exercise_id, text: r.text, words: r.words, checked: json(r.checked), at: ms(r.at) });
}
for (const r of rows('SELECT card_id, ease, interval, reps, due_at, first_at FROM cards')) {
  p.cards[r.card_id] = { id: r.card_id, ease: r.ease, interval: r.interval, reps: r.reps, due: ms(r.due_at), first: ms(r.first_at) };
}
for (const r of rows('SELECT card_id, grade, at FROM reviews ORDER BY rowid')) p.reviews.push({ card: r.card_id, grade: r.grade, at: ms(r.at) });

// The same shape as «Сохранить в файл» (src/stores/db.ts).
writeFileSync(out, JSON.stringify({ app: 'englingo', version: 1, exported: new Date().toISOString(), ...p }, null, 1));
console.log(
  `${out}: ${Object.keys(p.lessonsDone).length} lessons, ${p.attempts.length} attempts, ` +
    `${p.writings.length} writings, ${Object.keys(p.cards).length} cards`,
);

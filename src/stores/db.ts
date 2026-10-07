// Progress in IndexedDB: one store per kind of record, written as the
// learner works, read whole at start. Export and import move it between
// devices as one JSON file.
import { openDB, type DBSchema, type IDBPDatabase, type IDBPObjectStore } from 'idb';
import {
  emptyProgress,
  type Attempt,
  type ProgressData,
  type Review,
  type SavedCard,
  type Writing,
} from '../course/progress.ts';

interface Schema extends DBSchema {
  lessons: { key: string; value: { id: string; at: number } };
  attempts: { key: number; value: Attempt };
  drafts: { key: string; value: { ex: string; text: string } };
  writings: { key: number; value: Writing };
  cards: { key: string; value: SavedCard };
  reviews: { key: number; value: Review };
}

const STORES = ['lessons', 'attempts', 'drafts', 'writings', 'cards', 'reviews'] as const;

let db: Promise<IDBPDatabase<Schema>> | null = null;

function open() {
  db ??= openDB<Schema>('englingo', 1, {
    upgrade(d) {
      d.createObjectStore('lessons', { keyPath: 'id' });
      d.createObjectStore('attempts', { autoIncrement: true });
      d.createObjectStore('drafts', { keyPath: 'ex' });
      d.createObjectStore('writings', { keyPath: 'id', autoIncrement: true });
      d.createObjectStore('cards', { keyPath: 'id' });
      d.createObjectStore('reviews', { autoIncrement: true });
    },
  });
  return db;
}

export async function loadProgress(): Promise<ProgressData> {
  const d = await open();
  const tx = d.transaction(STORES);
  const [lessons, attempts, drafts, writings, cards, reviews] = await Promise.all([
    tx.objectStore('lessons').getAll(),
    tx.objectStore('attempts').getAll(),
    tx.objectStore('drafts').getAll(),
    tx.objectStore('writings').getAll(),
    tx.objectStore('cards').getAll(),
    tx.objectStore('reviews').getAll(),
  ]);
  return {
    lessonsDone: Object.fromEntries(lessons.map((l) => [l.id, l.at])),
    attempts,
    drafts: Object.fromEntries(drafts.map((x) => [x.ex, x.text])),
    writings,
    cards: Object.fromEntries(cards.map((c) => [c.id, c])),
    reviews,
  };
}

/** Resolves when the transaction has committed, not just when the request succeeded. */
async function write<S extends (typeof STORES)[number], R>(
  store: S,
  op: (s: IDBPObjectStore<Schema, [S], S, 'readwrite'>) => Promise<R>,
): Promise<R> {
  const tx = (await open()).transaction(store, 'readwrite');
  const [r] = await Promise.all([op(tx.objectStore(store)), tx.done]);
  return r;
}

export const putLesson = (id: string, at: number) => write('lessons', (s) => s.put({ id, at }));
export const addAttempt = (a: Attempt) => write('attempts', (s) => s.add(a));
export const putDraft = (ex: string, text: string) => write('drafts', (s) => s.put({ ex, text }));
export const addWriting = (w: Writing) => write('writings', (s) => s.add(w));
export async function saveReview(card: SavedCard, r: Review) {
  const tx = (await open()).transaction(['cards', 'reviews'], 'readwrite');
  await Promise.all([tx.objectStore('cards').put(card), tx.objectStore('reviews').add(r), tx.done]);
}

// --- moving progress between devices ---------------------------------------

export interface ProgressFile extends ProgressData {
  app: 'englingo';
  version: 1;
  exported: string;
}

export function toFile(p: ProgressData): ProgressFile {
  return { app: 'englingo', version: 1, exported: new Date().toISOString(), ...p };
}

/** fromFile checks a progress file; the error says why it is not one. */
export function fromFile(text: string): ProgressData {
  let f: Partial<ProgressFile>;
  try {
    f = JSON.parse(text);
  } catch {
    throw new Error('это не JSON');
  }
  if (f?.app !== 'englingo' || f.version !== 1) throw new Error('это не файл прогресса Englingo');
  const p = emptyProgress();
  const obj = (v: unknown) => v != null && typeof v === 'object' && !Array.isArray(v);
  if (!obj(f.lessonsDone) || !Array.isArray(f.attempts) || !obj(f.drafts) || !Array.isArray(f.writings) ||
      !obj(f.cards) || !Array.isArray(f.reviews)) {
    throw new Error('в файле не хватает данных');
  }
  return { ...p, lessonsDone: f.lessonsDone!, attempts: f.attempts, drafts: f.drafts!, writings: f.writings,
    cards: f.cards!, reviews: f.reviews };
}

/** replaceProgress swaps everything stored for p in one transaction. */
export async function replaceProgress(p: ProgressData) {
  const tx = (await open()).transaction(STORES, 'readwrite');
  await Promise.all(STORES.map((s) => tx.objectStore(s).clear()));
  const ops: Promise<unknown>[] = [];
  for (const [id, at] of Object.entries(p.lessonsDone)) ops.push(tx.objectStore('lessons').put({ id, at }));
  for (const a of p.attempts) ops.push(tx.objectStore('attempts').add(a));
  for (const [ex, text] of Object.entries(p.drafts)) ops.push(tx.objectStore('drafts').put({ ex, text }));
  for (const w of p.writings) ops.push(tx.objectStore('writings').put(w));
  for (const c of Object.values(p.cards)) ops.push(tx.objectStore('cards').put(c));
  for (const r of p.reviews) ops.push(tx.objectStore('reviews').add(r));
  await Promise.all([...ops, tx.done]);
}

/** Asks the browser not to evict the data under storage pressure (Safari does otherwise). */
export async function persist() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist();
  } catch {
    // Not supported: the data stays, just without the guarantee.
  }
}

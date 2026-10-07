// The learner's progress and what is derived from it. The data lives in
// IndexedDB (stores/db.ts); these functions read and change it in memory.
import { newCard, type CardState } from './srs.ts';
import { day } from './text.ts';

export interface Attempt {
  ex: string;
  answers: string[];
  results: boolean[];
  passed: boolean;
  at: number; // ms since epoch
}

export interface Writing {
  id?: number;
  ex: string;
  text: string;
  words: number;
  checked: boolean[];
  at: number;
}

export interface SavedCard extends CardState {
  id: string;
  first: number; // first review
}

export interface Review {
  card: string;
  grade: number;
  at: number;
}

export interface ProgressData {
  lessonsDone: Record<string, number>;
  attempts: Attempt[];
  drafts: Record<string, string>;
  writings: Writing[];
  cards: Record<string, SavedCard>;
  reviews: Review[];
}

export const emptyProgress = (): ProgressData => ({
  lessonsDone: {},
  attempts: [],
  drafts: {},
  writings: [],
  cards: {},
  reviews: [],
});

export const count = (results: boolean[]) => results.filter(Boolean).length;

export interface ExerciseState {
  draft: string;
  attempts: number;
  solved: boolean;
  best: number; // best score of an attempt
  last: boolean[]; // per-item results of the latest attempt
}

export function exerciseState(p: ProgressData, id: string): ExerciseState {
  const st: ExerciseState = { draft: p.drafts[id] ?? '', attempts: 0, solved: false, best: 0, last: [] };
  for (const a of p.attempts) {
    if (a.ex !== id) continue;
    st.attempts++;
    st.solved ||= a.passed;
    st.best = Math.max(st.best, count(a.results));
    st.last = a.results;
  }
  for (const w of p.writings) {
    if (w.ex !== id) continue;
    st.attempts++;
    st.solved = true;
  }
  return st;
}

export function solvedExercises(p: ProgressData): Set<string> {
  const solved = new Set<string>();
  for (const a of p.attempts) if (a.passed) solved.add(a.ex);
  for (const w of p.writings) solved.add(w.ex);
  return solved;
}

export interface Score {
  attempts: number;
  best: number;
  last: boolean[];
}

export function scores(p: ProgressData): Map<string, Score> {
  const out = new Map<string, Score>();
  for (const a of p.attempts) {
    const sc = out.get(a.ex) ?? { attempts: 0, best: 0, last: [] };
    sc.attempts++;
    sc.last = a.results;
    sc.best = Math.max(sc.best, count(a.results));
    out.set(a.ex, sc);
  }
  return out;
}

/** activeDays are the local dates with any activity. */
export function activeDays(p: ProgressData): Set<string> {
  const days = new Set<string>();
  for (const at of Object.values(p.lessonsDone)) days.add(day(at));
  for (const a of p.attempts) days.add(day(a.at));
  for (const w of p.writings) days.add(day(w.at));
  for (const r of p.reviews) days.add(day(r.at));
  return days;
}

/** newCardsSince counts cards first reviewed at or after t. */
export function newCardsSince(p: ProgressData, t: number): number {
  return Object.values(p.cards).filter((c) => c.first >= t).length;
}

// --- changes: each updates p and returns the record to persist ------------

export function markLessonDone(p: ProgressData, id: string, at: number): number {
  p.lessonsDone[id] ??= at;
  return p.lessonsDone[id];
}

export function saveAttempt(p: ProgressData, a: Attempt): Attempt {
  p.attempts.push(a);
  p.drafts[a.ex] = JSON.stringify(a.answers);
  return a;
}

export function saveDraft(p: ProgressData, ex: string, text: string) {
  p.drafts[ex] = text;
}

export function saveWriting(p: ProgressData, w: Writing): Writing {
  p.writings.push(w);
  p.drafts[w.ex] = w.text;
  return w;
}

export function cardState(p: ProgressData, id: string): CardState {
  const c = p.cards[id];
  return c ? { ease: c.ease, interval: c.interval, reps: c.reps, due: c.due } : newCard();
}

export function saveCard(p: ProgressData, id: string, st: CardState, grade: number, at: number): [SavedCard, Review] {
  const card: SavedCard = { ...st, id, first: p.cards[id]?.first ?? at };
  p.cards[id] = card;
  const r = { card: id, grade, at };
  p.reviews.push(r);
  return [card, r];
}

/** writings, newest first. */
export const writingsNewestFirst = (p: ProgressData) => [...p.writings].reverse();

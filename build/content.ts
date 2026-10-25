// Loads the course (modules, lessons, exercises, cards) from a file tree.
//
// Layout:
//
//	<module-dir>/module.yaml
//	<module-dir>/<lesson-dir>/lesson.md          markdown with YAML frontmatter
//	<module-dir>/<lesson-dir>/<exercise-dir>/    exercise.yaml (see Exercise)
//	book*.yaml                                   books lessons cite
//	cards/*.yaml                                 review cards
//	audio/...                                    audio files for listening and dictation
import type { FS } from './fs.ts';
import { parseYAML } from './yaml.ts';
import {
  bookSchema,
  cardsSchema,
  decode,
  exerciseSchema,
  lessonSchema,
  moduleSchema,
  type AudioSource,
  type BookFile,
  type CardFile,
  type ExerciseFile,
  type ItemFile,
  type Source,
  type Unit,
} from './schema.ts';

export type { AudioSource, Source, Unit };

export interface Level {
  code: string;
  track: string; // what the learner moves between
  exam: string; // Cambridge exam the level aims at
}

/** Levels a module can belong to. */
export const LEVELS: Record<string, Level> = {
  b2: { code: 'b2', track: 'B1 → B2', exam: 'B2 First' },
  c1: { code: 'c1', track: 'B2 → C1', exam: 'C1 Advanced' },
};

export interface Book extends BookFile {
  byN: Map<number, Unit>;
}

/** unitName is how a unit is cited: "Unit 11" or its label, "3.2". */
export const unitName = (u: Unit) => u.label || `Unit ${u.n}`;

export interface BookRefs {
  book: Book;
  units: Unit[];
}

export interface Module {
  id: string;
  level: Level;
  book: Book | null;
  title: string;
  summary: string;
  topics: string[];
  sources: Source[];
  lessons: Lesson[];
}

export interface Lesson {
  id: string; // "<module>/<lesson>"
  title: string;
  kind: string; // grammar (default), reading, writing or test
  sources: Source[];
  bookUnits: number[];
  also: Record<string, number[]>;
  refs: BookRefs[]; // cited units grouped by book: the module's book first
  body: string;
  bodyLine: number; // line of lesson.md where body starts
  theory: string; // body before "## Практика"
  practice: string; // text after it without the exercise fences
  module: Module;
  prev: Lesson | null;
  next: Lesson | null;
  exercises: Exercise[]; // in order of reference in the body
}

/** Exercise types. Every type except writing is checked automatically. */
export const EXERCISE_TYPES = [
  'gap', // type the missing word or form into ___
  'choice', // pick one of the options
  'transform', // B2 First key word transformation: q, key, stem with ___
  'error', // q has a mistake; type the corrected sentence
  'order', // put the words of the answer in order
  'reading', // text plus choice or gap questions
  'writing', // free text, self-checked against a checklist
  'listening', // one recording (local audio or an external link) plus choice or gap questions
  'dictation', // each item is a short recording; type what you hear
] as const;
export type ExerciseType = (typeof EXERCISE_TYPES)[number];

export type Item = ItemFile;

export interface Exercise extends Omit<ExerciseFile, 'type'> {
  id: string;
  type: ExerciseType;
  lesson: Lesson | null;
}

export type Card = CardFile;

export interface Course {
  books: Map<string, Book>; // book.yaml is "book", book-advanced.yaml is "book-advanced"
  modules: Module[];
  lessons: Map<string, Lesson>;
  exercises: Map<string, Exercise>;
  cards: Card[];
  cardByID: Map<string, Card>;
}

/** The top-level content directory with audio files. */
export const AUDIO_DIR = 'audio';

/** Licenses under which audio may be stored in the course and served from it.
 * TTS is the course's own text voiced by a speech synthesizer; author names the voice. */
const OPEN_LICENSES = new Set(['CC0', 'CC BY', 'CC BY-SA', 'PD', 'TTS']);

/** Sites a listening exercise may link to: their recordings are copyrighted,
 * so the course keeps only its own questions and sends the learner there. */
const LINK_HOSTS = [
  'bbc.co.uk',
  'britishcouncil.org',
  'cambridgeenglish.org',
  'learningenglish.voanews.com',
  'ted.com',
  'youtube.com',
];

const fields = (s: string) => s.split(/\s+/).filter(Boolean);
const count = (s: string, sub: string) => s.split(sub).length - 1;

/** licenseBase drops the version: "CC BY 4.0" → "CC BY". */
export function licenseBase(l: string): string {
  const f = fields(l);
  if (f.length > 1 && /[0-9]/.test(f[f.length - 1]!)) f.pop();
  return f.join(' ');
}

function validateSource(a: AudioSource | null, stored: boolean) {
  if (!a) throw new Error('needs audio_source');
  if (!a.title || !a.url || !a.license) throw new Error('audio_source needs title, url and license');
  if (stored && !OPEN_LICENSES.has(licenseBase(a.license)))
    throw new Error(`audio stored in the course must be CC0, CC BY, CC BY-SA, PD or TTS, got "${a.license}"`);
  if (stored && a.license.startsWith('CC BY') && !a.author) throw new Error(`${a.license} needs author for attribution`);
  if (a.license === 'TTS' && !a.author) throw new Error('TTS needs author: the voice, e.g. en-GB-SoniaNeural');
}

export const isChoice = (it: Item) => it.options.length > 0;

/** expected is the right answer as shown to the learner. */
export function expected(it: Item): string {
  if (isChoice(it)) return it.options[it.answer]!;
  return it.answers[0] ?? '';
}

/** pass returns how many of total items must be right for the exercise to count as solved. */
export function pass(passPct: number, total: number): number {
  const pct = passPct || 80;
  return Math.floor((total * pct + 99) / 100);
}

function validateExercise(ex: ExerciseFile) {
  if (!ex.title) throw new Error('missing title');
  if (!(EXERCISE_TYPES as readonly string[]).includes(ex.type)) throw new Error(`unknown type "${ex.type}"`);
  if (ex.type === 'writing') {
    if (!ex.prompt) throw new Error('writing needs a prompt');
    if (ex.words[0] <= 0 || ex.words[1] < ex.words[0]) throw new Error('writing needs words: [min, max]');
    if (ex.checklist.length === 0) throw new Error('writing needs a checklist');
    if (!ex.model_answer) throw new Error('writing needs a model_answer');
    return;
  }
  if (ex.type === 'reading' && !ex.text) throw new Error('reading needs a text');
  if (ex.type === 'listening') {
    if (!ex.audio === !ex.link) throw new Error('listening needs either audio or link');
    if (ex.link && !allowedLink(ex.link))
      throw new Error(`link "${ex.link}": only https pages of known listening sites`);
    validateSource(ex.audio_source, ex.audio !== '');
  } else if (ex.audio || ex.link || ex.audio_source || ex.transcript) {
    throw new Error('audio, link, transcript and audio_source belong to listening');
  }
  if (ex.items.length === 0) throw new Error('no items');
  if (ex.pass < 0 || ex.pass > 100) throw new Error('pass must be 0..100');
  ex.items.forEach((it, i) => {
    try {
      validateItem(it, ex.type);
    } catch (e) {
      throw new Error(`item ${i + 1} ("${it.q}"): ${(e as Error).message}`);
    }
  });
}

function validateItem(it: Item, typ: string) {
  if (!it.q && typ !== 'dictation') throw new Error('missing q');
  if (typ === 'dictation') {
    if (!it.audio) throw new Error('dictation item needs audio');
    validateSource(it.audio_source, true);
  } else if (it.audio || it.audio_source) {
    throw new Error('audio on an item belongs to dictation');
  }
  const choice = typ === 'choice' || ((typ === 'reading' || typ === 'listening' || typ === 'dictation') && isChoice(it));
  if (choice) {
    if (it.options.length < 2) throw new Error('needs at least two options');
    if (it.answer < 0 || it.answer >= it.options.length) throw new Error(`answer ${it.answer} out of range`);
    if (it.answers.length > 0) throw new Error('choice items use answer, not answers');
    return;
  }
  if (isChoice(it)) throw new Error(`${typ} items have no options`);
  if (it.answers.length === 0) throw new Error('no answers');
  if (it.answers.some((a) => a.trim() === '')) throw new Error('empty answer');
  switch (typ) {
    case 'gap': {
      const n = count(it.q, '___');
      if (n > 1) throw new Error(`one ___ per item, got ${n}`);
      break;
    }
    case 'transform':
      if (!it.key || count(it.stem, '___') !== 1) throw new Error('transform needs key and a stem with one ___');
      break;
    case 'order':
      if (fields(it.answers[0]!).length < 3) throw new Error('order needs a sentence of at least three words');
      break;
  }
}

/** Prefixes an error with where it happened: "module m: lesson l: …". */
function wrap<T>(prefix: string, fn: () => T): T {
  try {
    return fn();
  } catch (e) {
    throw new Error(`${prefix}: ${(e as Error).message}`);
  }
}

const readYAML = (fsys: FS, name: string) => wrap(name, () => parseYAML(fsys.read(name)));

/** load reads the whole course from fsys. */
export function load(fsys: FS): Course {
  const c: Course = {
    books: new Map(),
    modules: [],
    lessons: new Map(),
    exercises: new Map(),
    cards: [],
    cardByID: new Map(),
  };
  const top = fsys.list('.');
  for (const f of top) {
    if (f.dir || !/^book.*\.yaml$/.test(f.name)) continue;
    const file = decode(bookSchema, readYAML(fsys, f.name) ?? {}, f.name);
    const b: Book = { ...file, byN: new Map() };
    for (const u of b.units) {
      if (b.byN.has(u.n)) throw new Error(`${f.name}: duplicate unit ${u.n}`);
      b.byN.set(u.n, u);
    }
    c.books.set(f.name.replace(/\.yaml$/, ''), b);
  }
  for (const e of top) {
    if (!e.dir || e.name === 'cards' || e.name === AUDIO_DIR) continue;
    c.modules.push(wrap(`module ${e.name}`, () => loadModule(fsys, e.name, c)));
  }

  let prev: Lesson | null = null;
  for (const m of c.modules) {
    for (const l of m.lessons) {
      if (prev) [prev.next, l.prev] = [l, prev];
      prev = l;
    }
  }

  for (const l of c.lessons.values()) {
    if (l.bookUnits.length > 0) {
      l.refs.push(wrap(`lesson ${l.id}`, () => bookRefs(l.module.book, l.bookUnits)));
    }
    for (const name of Object.keys(l.also).sort()) {
      const b = c.books.get(name);
      if (!b) throw new Error(`lesson ${l.id}: unknown book "${name}" in also`);
      l.refs.push(wrap(`lesson ${l.id}: ${name}`, () => bookRefs(b, l.also[name]!)));
    }
  }

  const modules = new Set(c.modules.map((m) => m.id));
  for (const [id, ex] of c.exercises) {
    for (const it of ex.items) {
      if (it.topic && !modules.has(it.topic))
        throw new Error(`exercise ${id}: item "${it.q}": unknown topic module "${it.topic}"`);
    }
  }

  loadCards(fsys, c);
  return c;
}

function bookRefs(b: Book | null, units: number[]): BookRefs {
  return {
    book: b!,
    units: units.map((n) => {
      const u = b?.byN.get(n);
      if (!u) throw new Error(`unknown book unit ${n}`);
      return u;
    }),
  };
}

function loadModule(fsys: FS, dir: string, c: Course): Module {
  const file = decode(moduleSchema, readYAML(fsys, `${dir}/module.yaml`) ?? {}, `${dir}/module.yaml`);
  const level = LEVELS[file.level || 'b2'];
  if (!level) throw new Error(`unknown level "${file.level}"`);
  const book = c.books.get(file.book || 'book') ?? null;
  if (file.book && !book) throw new Error(`unknown book "${file.book}"`);
  const m: Module = {
    id: dir,
    level,
    book,
    title: file.title,
    summary: file.summary,
    topics: file.topics,
    sources: file.sources,
    lessons: [],
  };
  for (const e of fsys.list(dir)) {
    if (!e.dir) continue;
    const l = wrap(`lesson ${e.name}`, () => loadLesson(fsys, `${dir}/${e.name}`, m, c));
    m.lessons.push(l);
  }
  return m;
}

function loadLesson(fsys: FS, dir: string, m: Module, c: Course): Lesson {
  const [front, body] = splitFrontmatter(fsys.read(`${dir}/lesson.md`));
  const meta = decode(lessonSchema, wrap('frontmatter', () => parseYAML(front)) ?? {}, 'frontmatter');
  const [theory, practice] = splitPractice(body);
  const l: Lesson = {
    id: dir,
    title: meta.title,
    kind: meta.kind,
    sources: meta.sources,
    bookUnits: meta.book,
    also: meta.also,
    refs: [],
    body,
    // Opening ---, the frontmatter (no trailing newline), closing ---, then the body.
    bodyLine: count(front, '\n') + 4,
    theory,
    practice,
    module: m,
    prev: null,
    next: null,
    exercises: [],
  };
  c.lessons.set(l.id, l);

  for (const e of fsys.list(dir)) {
    if (!e.dir) continue;
    const ex = wrap(`exercise ${e.name}`, () => loadExercise(fsys, `${dir}/${e.name}`));
    if (c.exercises.has(ex.id)) throw new Error(`duplicate exercise id "${ex.id}"`);
    ex.lesson = l;
    c.exercises.set(ex.id, ex);
  }

  // Keep exercise order as referenced in the lesson body.
  for (const id of exerciseRefs(body)) {
    const ex = c.exercises.get(id);
    if (!ex) throw new Error(`lesson references unknown exercise "${id}"`);
    l.exercises.push(ex);
  }
  return l;
}

function loadExercise(fsys: FS, dir: string): Exercise {
  const name = `${dir}/exercise.yaml`;
  const file = decode(exerciseSchema, readYAML(fsys, name) ?? {}, name);
  validateExercise(file);
  for (const f of [file.audio, ...file.items.map((it) => it.audio)]) {
    if (!f) continue;
    if (!f.startsWith(AUDIO_DIR + '/') || !validPath(f)) throw new Error(`audio "${f}" must be a path under ${AUDIO_DIR}/`);
    if (!fsys.exists(f)) throw new Error(`audio "${f}": file does not exist`);
  }
  return { ...file, type: file.type as ExerciseType, id: dir.slice(dir.lastIndexOf('/') + 1), lesson: null };
}

/** validPath: a relative path without empty, "." or ".." elements. */
const validPath = (p: string) => p.split('/').every((el) => el !== '' && el !== '.' && el !== '..');

export function allowedLink(raw: string): boolean {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== 'https:') return false;
  return LINK_HOSTS.some((h) => u.host === h || u.host.endsWith('.' + h));
}

function loadCards(fsys: FS, c: Course) {
  if (!fsys.list('.').some((e) => e.dir && e.name === 'cards')) return;
  for (const e of fsys.list('cards')) {
    if (e.dir || !e.name.endsWith('.yaml')) continue;
    const f = `cards/${e.name}`;
    const cards = decode(cardsSchema, readYAML(fsys, f) ?? [], f);
    for (const card of cards) {
      if (!card.id || !card.q || !card.a) throw new Error(`${f}: card needs id, q and a`);
      if (c.cardByID.has(card.id)) throw new Error(`${f}: duplicate card id "${card.id}"`);
      if (!c.lessons.has(card.lesson))
        throw new Error(`${f}: card "${card.id}" references unknown lesson "${card.lesson}"`);
      c.cardByID.set(card.id, card);
      c.cards.push(card);
    }
  }
}

const PRACTICE_HEADING = '## Практика';

/** splitPractice splits a lesson at its "## Практика" heading. */
export function splitPractice(body: string): [theory: string, practice: string] {
  const lines = body.split('\n');
  const i = lines.findIndex((line) => line.trim() === PRACTICE_HEADING);
  if (i < 0) return [body, ''];
  const rest: string[] = [];
  let skip = false;
  for (const l of lines.slice(i + 1)) {
    const t = l.trim();
    if (t.startsWith('```exercise ')) {
      skip = true;
      continue;
    }
    if (skip && t === '```') {
      skip = false;
      continue;
    }
    rest.push(l);
  }
  return [lines.slice(0, i).join('\n'), rest.join('\n').trim()];
}

/** exerciseRefs returns ids from ```exercise <id> fences in order. */
export function exerciseRefs(md: string): string[] {
  const ids: string[] = [];
  for (const line of md.split('\n')) {
    const t = line.trim();
    if (t.startsWith('```exercise ')) ids.push(t.slice('```exercise '.length).trim());
  }
  return ids;
}

function splitFrontmatter(raw: string): [front: string, body: string] {
  const delim = '---\n';
  raw = raw.replaceAll('\r\n', '\n');
  if (!raw.startsWith(delim)) throw new Error('lesson.md must start with --- frontmatter');
  const rest = raw.slice(delim.length);
  const end = rest.indexOf('\n' + delim);
  if (end < 0) throw new Error('unterminated frontmatter');
  return [rest.slice(0, end), rest.slice(end + delim.length + 1)];
}

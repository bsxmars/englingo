// Turns the loaded course into what the app imports: a small index, one
// chunk per lesson with rendered HTML, and the review cards.
import type * as T from '../src/course/types.ts';
import { expected, isChoice, pass, unitName, type Course, type Exercise, type Lesson } from './content.ts';
import { inline, markdown } from './markdown.ts';

export interface Compiled {
  index: T.CourseIndex;
  lessons: Map<string, T.LessonData>;
  cards: T.Card[];
}

/** compile renders every markdown field, so a broken quiz fails the build. */
export function compile(c: Course): Compiled {
  const levels: T.Level[] = [];
  for (const m of c.modules) if (!levels.some((l) => l.code === m.level.code)) levels.push({ ...m.level });
  const index: T.CourseIndex = {
    levels,
    modules: c.modules.map((m) => ({
      id: m.id,
      level: m.level.code,
      title: m.title,
      summary: m.summary,
      topics: m.topics,
      sources: m.sources,
      lessons: m.lessons.map((l) => l.id),
    })),
    lessons: {},
    cards: c.cards.map((card) => ({ id: card.id, lesson: card.lesson })),
  };
  const lessons = new Map<string, T.LessonData>();
  for (const m of c.modules) {
    for (const l of m.lessons) {
      index.lessons[l.id] = {
        id: l.id,
        title: l.title,
        kind: l.kind,
        module: m.id,
        prev: l.prev?.id ?? null,
        next: l.next?.id ?? null,
        exercises: l.exercises.map((ex) => ({
          id: ex.id,
          title: ex.title,
          type: ex.type,
          topics: ex.items.some((it) => it.topic) ? ex.items.map((it) => it.topic) : [],
        })),
      };
      lessons.set(l.id, at(`lesson ${l.id}`, () => lessonData(l)));
    }
  }
  const cards = c.cards.map((card) =>
    at(`card ${card.id}`, () => ({ id: card.id, lesson: card.lesson, q: markdown(card.q), a: markdown(card.a) })),
  );
  return { index, lessons, cards };
}

function at<R>(where: string, fn: () => R): R {
  try {
    return fn();
  } catch (e) {
    throw new Error(`${where}: ${(e as Error).message}`);
  }
}

function lessonData(l: Lesson): T.LessonData {
  return {
    id: l.id,
    theory: markdown(l.theory),
    practice: markdown(l.practice),
    refs: l.refs.map(({ book, units }) => ({
      title: book.title,
      author: book.author,
      keyPage: book.key_page,
      extraTitle: book.extra_title,
      extraKeyPage: book.extra_key_page,
      units: units.map((u) => ({ name: unitName(u), title: u.title, page: u.page, extra: u.extra, ex: u.ex })),
    })),
    sources: l.sources,
    exercises: l.exercises.map((ex) => at(`exercise ${ex.id}`, () => exercise(ex))),
  };
}

const md = (s: string) => (s ? markdown(s) : '');
const inl = (s: string) => (s ? inline(s) : '');

function exercise(ex: Exercise): T.Exercise {
  return {
    id: ex.id,
    title: ex.title,
    type: ex.type,
    intro: md(ex.intro),
    hints: ex.hints,
    text: md(ex.text),
    audio: ex.audio,
    link: ex.link,
    transcript: md(ex.transcript),
    source: ex.audio_source,
    pass: pass(ex.pass, ex.items.length),
    prompt: md(ex.prompt),
    promptText: ex.prompt,
    words: ex.words,
    targetGrammar: ex.target_grammar,
    checklist: ex.checklist,
    modelAnswer: md(ex.model_answer),
    items: ex.items.map((it, i) => {
      const v: T.Item = {
        n: i + 1,
        choice: isChoice(it),
        q: '',
        inline: false,
        before: '',
        after: '',
        key: it.key,
        options: [],
        prefill: '',
        words: [],
        audio: it.audio,
        source: it.audio_source,
        answer: it.answer,
        answers: it.answers,
        expected: expected(it),
        explain: md(it.explain),
        topic: it.topic,
      };
      let gapped = it.q;
      if (ex.type === 'transform') {
        v.q = inl(it.q);
        gapped = it.stem;
      }
      if (v.choice) {
        v.q = inl(it.q);
        v.options = it.options.map(inl);
      } else if (ex.type === 'gap' || ex.type === 'transform' || ex.type === 'reading' || ex.type === 'listening') {
        const cut = gapped.indexOf('___');
        if (cut >= 0) {
          v.inline = true;
          v.before = inl(gapped.slice(0, cut));
          v.after = inl(gapped.slice(cut + 3));
        } else {
          v.q = inl(gapped);
        }
      } else if (ex.type === 'error') {
        v.q = inl(it.q);
        v.prefill = it.q;
      } else if (ex.type === 'order') {
        v.q = inl(it.q);
        v.words = shuffled(it.answers[0]!);
      } else if (ex.type === 'dictation') {
        v.q = inl(it.q);
      }
      return v;
    }),
  };
}

/** shuffled splits a sentence into words without its final punctuation and
 * mixes them the same way every time, never leaving them in the right order. */
export function shuffled(sentence: string): string[] {
  const words = sentence
    .replace(/[\p{P}]+$/u, (p) => p.replace(/[^']/g, ''))
    .split(/\s+/)
    .filter(Boolean);
  // FNV-1a seeds mulberry32, so a sentence always shuffles the same way.
  let seed = 0x811c9dc5;
  for (const ch of new TextEncoder().encode(sentence)) seed = Math.imul(seed ^ ch, 0x01000193) >>> 0;
  const rnd = () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = [...words];
  for (let round = 0; round < 5; round++) {
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [out[i], out[j]] = [out[j]!, out[i]!];
    }
    if (out.join(' ') !== words.join(' ')) break;
  }
  return out;
}

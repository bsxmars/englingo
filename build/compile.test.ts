import { expect, it } from 'vitest';
import { compile, shuffled } from './compile.ts';
import { load } from './content.ts';
import { mapFS } from './fs.ts';
import { grade } from '../src/course/grade.ts';
import { claudePrompt, writingDoc } from '../src/course/claude.ts';
import { dueCards } from '../src/course/review.ts';
import { emptyProgress } from '../src/course/progress.ts';

it('shuffles words stably and never in order', () => {
  const got = shuffled('Where have you been all this time?');
  expect(got).toHaveLength(7);
  expect(got.join(' ')).not.toBe('Where have you been all this time');
  expect(shuffled('Where have you been all this time?')).toEqual(got);
  expect(shuffled("Where's the man, then?").sort()).toEqual(["Where's", 'man,', 'the', 'then']);
});

const fixture = () =>
  compile(
    load(
      mapFS({
        'm/module.yaml': 'title: M\n',
        'm/l/lesson.md': '---\ntitle: L\n---\nTheory.\n\n## Практика\n\nGo.\n\n```exercise gap1\n```\n\n```exercise w1\n```\n',
        'm/l/gap1/exercise.yaml':
          'title: G\ntype: gap\nitems:\n  - q: I ___ here since 2019.\n    answers: [have lived, have been living]\n    explain: "**since** → Present Perfect"\n  - q: We ___ two years ago.\n    answers: [met]\n',
        'm/l/w1/exercise.yaml':
          'title: W\ntype: writing\nprompt: Write.\nwords: [10, 20]\nchecklist: [one, two]\nmodel_answer: Text.\ntarget_grammar: [Present Perfect]\n',
        'm/l2/lesson.md': '---\ntitle: L2\n---\nNext.\n',
        'cards/m.yaml': '- {id: c1, lesson: m/l, q: "Q?", a: "**A**"}\n- {id: c2, lesson: m/l2, q: "Q2", a: "A2"}\n',
      }),
    ),
  );

it('compiles the index and lesson chunks', () => {
  const { index, lessons, cards } = fixture();
  expect(index.levels.map((l) => l.code)).toEqual(['b2']);
  expect(index.lessons['m/l']).toMatchObject({ next: 'm/l2', exercises: [{ id: 'gap1' }, { id: 'w1' }] });
  const l = lessons.get('m/l')!;
  expect(l.theory).toBe('<p>Theory.</p>\n');
  expect(l.practice).toBe('<p>Go.</p>\n');
  const gap = l.exercises[0]!;
  expect(gap.items[0]).toMatchObject({ inline: true, before: 'I', after: 'here since 2019.', expected: 'have lived' });
  expect(gap.items[0]!.explain).toBe('<p><strong>since</strong> → Present Perfect</p>\n');
  expect(gap.pass).toBe(2);
  expect(cards[0]!.a).toBe('<p><strong>A</strong></p>\n');
});

it('grades answers', () => {
  const ex = fixture().lessons.get('m/l')!.exercises[0]!;
  let g = grade(ex, ['has lived', 'met']);
  expect([g.score, g.passed]).toEqual([1, false]);
  g = grade(ex, ["'ve been living", 'Met.']);
  expect([g.score, g.passed]).toEqual([2, true]);
  expect(() => grade(ex, ['x'])).toThrow(/want 2 answers/);
});

it('writes the Claude prompt and the text copy', () => {
  const { index, lessons } = fixture();
  const w = lessons.get('m/l')!.exercises[1]!;
  const text = 'Here is my short text.';
  expect(claudePrompt(w, index.levels[0]!, text, 4)).toContain('Cambridge B2 First Writing');
  const doc = writingDoc(w, 'm/l', index.levels[0]!, text, 4, [true, false], '2026-10-07 12:00');
  for (const want of ['exercise: w1', '- [x] one', '- [ ] two', text, 'Целевая грамматика: Present Perfect']) {
    expect(doc).toContain(want);
  }
});

it('unlocks cards of finished lessons, up to the daily quota', () => {
  const { index } = fixture();
  const p = emptyProgress();
  expect(dueCards(index, p, 'b2', Date.now())).toEqual([]);
  p.lessonsDone['m/l'] = Date.now();
  expect(dueCards(index, p, 'b2', Date.now())).toEqual(['c1']);
  expect(dueCards(index, p, 'c1', Date.now())).toEqual([]);
});

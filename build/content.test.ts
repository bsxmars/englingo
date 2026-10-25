import { describe, expect, it } from 'vitest';
import { load, pass, splitPractice, unitName } from './content.ts';
import { mapFS } from './fs.ts';

describe('splitPractice', () => {
  it('splits at the practice heading and drops exercise fences', () => {
    const body = 'Intro\n\n## Раздел\n\ntext\n\n## Практика\n\nСначала прочитай.\n\n```exercise ex-a\n```\n\n```exercise ex-b\n```\n';
    expect(splitPractice(body)).toEqual(['Intro\n\n## Раздел\n\ntext\n', 'Сначала прочитай.']);
  });
  it('keeps the whole body without the heading', () => {
    expect(splitPractice('only theory\n')).toEqual(['only theory\n', '']);
  });
});

const course = (ex: string, yaml: string) => ({
  'm/module.yaml': 'title: M\n',
  'm/l/lesson.md': '---\ntitle: L\n---\n## Практика\n\n```exercise ' + ex + '\n```\n',
  [`m/l/${ex}/exercise.yaml`]: yaml,
});

describe('exercises', () => {
  const good: Record<string, string> = {
    gap: 'title: G\ntype: gap\nitems:\n  - q: I ___ here.\n    answers: [live]\n',
    choice: 'title: C\ntype: choice\nitems:\n  - q: Pick\n    options: [a, b]\n    answer: 1\n',
    transform: 'title: T\ntype: transform\nitems:\n  - q: He began 2 years ago.\n    key: FOR\n    stem: He ___ two years.\n    answers: [has been working for]\n',
    order: 'title: O\ntype: order\nitems:\n  - q: Make a question\n    answers: ["Where do you live?"]\n',
    reading: 'title: R\ntype: reading\ntext: Hello.\nitems:\n  - q: True?\n    options: [yes, no]\n    answer: 0\n  - q: Word?\n    answers: [hello]\n',
    writing: 'title: W\ntype: writing\nprompt: Write.\nwords: [140, 190]\nchecklist: [one]\nmodel_answer: Text.\n',
  };
  for (const [name, y] of Object.entries(good)) {
    it(`loads ${name}`, () => expect(() => load(mapFS(course(name, y)))).not.toThrow());
  }
  const bad: Record<string, string> = {
    'unknown type': 'title: X\ntype: essay\nitems:\n  - q: a\n    answers: [b]\n',
    'typo field': 'title: X\ntype: gap\nitems:\n  - q: a ___\n    anwers: [b]\n',
    'no answers': 'title: X\ntype: gap\nitems:\n  - q: a ___\n',
    'answer range': 'title: X\ntype: choice\nitems:\n  - q: a\n    options: [a, b]\n    answer: 2\n',
    'two gaps': 'title: X\ntype: gap\nitems:\n  - q: a ___ b ___\n    answers: [c]\n',
    'no key': 'title: X\ntype: transform\nitems:\n  - q: a\n    stem: b ___\n    answers: [c]\n',
    'no words': 'title: X\ntype: writing\nprompt: p\nchecklist: [c]\nmodel_answer: m\n',
    'unknown topic': 'title: X\ntype: choice\nitems:\n  - q: a\n    options: [a, b]\n    answer: 0\n    topic: nope\n',
    'reading notext': 'title: X\ntype: reading\nitems:\n  - q: a\n    answers: [b]\n',
  };
  for (const [name, y] of Object.entries(bad)) {
    it(`rejects ${name}`, () => expect(() => load(mapFS(course('ex', y)))).toThrow());
  }
  it('names the file and field of a typo', () => {
    expect(() => load(mapFS(course('ex', bad['typo field']!)))).toThrow(
      /module m: lesson l: exercise ex: m\/l\/ex\/exercise.yaml: items.0: field anwers not found/,
    );
  });
  it('keeps numbers in answers as written', () => {
    const c = load(mapFS(course('ex', 'title: X\ntype: gap\nitems:\n  - q: a ___\n    answers: [007, 1.50]\n')));
    expect(c.exercises.get('ex')!.items[0]!.answers).toEqual(['007', '1.50']);
  });
});

describe('pass', () => {
  it('defaults to 80 %', () => {
    expect(pass(0, 10)).toBe(8);
    expect(pass(0, 7)).toBe(6);
    expect(pass(100, 7)).toBe(7);
  });
});

describe('lessons', () => {
  it('counts the body line', () => {
    const c = load(mapFS({
      'm/module.yaml': 'title: M\n',
      'm/l/lesson.md': '---\ntitle: L\nsources: []\n---\nfirst body line\n',
      'cards/none.yaml': '[]\n',
    }));
    expect(c.lessons.get('m/l')!.bodyLine).toBe(5);
  });

  it('resolves book units', () => {
    const files: Record<string, string> = {
      'book.yaml': 'title: B\nkey_page: 300\nunits:\n  - {n: 11, title: PP, page: 26}\n',
      'm/module.yaml': 'title: M\n',
      'm/l/lesson.md': '---\ntitle: L\nbook: [11]\n---\nbody\n',
    };
    const r = load(mapFS(files)).lessons.get('m/l')!.refs;
    expect(r).toHaveLength(1);
    expect(r[0]!.units[0]!.page).toBe(26);
    files['m/l/lesson.md'] = '---\ntitle: L\nbook: [12]\n---\nbody\n';
    expect(() => load(mapFS(files))).toThrow(/unknown book unit 12/);
  });

  it('reads two books and levels', () => {
    const files: Record<string, string> = {
      'book.yaml': 'title: I\nunits:\n  - {n: 11, title: PP, page: 26}\n',
      'book-advanced.yaml': 'title: A\nunits:\n  - {n: 302, label: "3.2", title: Complex modals, page: 30, extra: 14}\n',
      'a/module.yaml': 'title: A\n',
      'a/l/lesson.md': '---\ntitle: L\nbook: [11]\n---\nbody\n',
      'c1-a/module.yaml': 'title: C\nlevel: c1\nbook: book-advanced\n',
      'c1-a/l/lesson.md': '---\ntitle: L\nbook: [302]\n---\nbody\n',
    };
    const c = load(mapFS(files));
    expect(c.modules[0]!.level.exam).toBe('B2 First');
    expect(c.modules[0]!.book!.title).toBe('I');
    const l = c.lessons.get('c1-a/l')!;
    expect(l.refs).toHaveLength(1);
    const u = l.refs[0]!.units[0]!;
    expect([unitName(u), u.extra, l.module.level.exam]).toEqual(['3.2', 14, 'C1 Advanced']);
    // A c1 lesson cannot cite the intermediate book's units.
    files['c1-a/l/lesson.md'] = '---\ntitle: L\nbook: [11]\n---\nbody\n';
    expect(() => load(mapFS(files))).toThrow();
  });

  it('cites other books with also', () => {
    const files: Record<string, string> = {
      'book.yaml': 'title: Intermediate\nunits:\n  - {n: 11, title: PP, page: 26}\n',
      'book-advanced.yaml': 'title: Advanced\nunits:\n  - {n: 302, label: "3.2", title: Complex modals, page: 30}\n',
      'm/module.yaml': 'title: M\n',
      'm/l/lesson.md': '---\ntitle: L\nbook: [11]\nalso: {book-advanced: [302]}\n---\nbody\n',
    };
    const l = load(mapFS(files)).lessons.get('m/l')!;
    expect(l.module.level.track).toBe('B1 → B2');
    expect(l.refs.map((r) => r.book.title)).toEqual(['Intermediate', 'Advanced']);
    expect(unitName(l.refs[0]!.units[0]!)).toBe('Unit 11');
    for (const lesson of ['---\ntitle: L\nalso: {book-x: [302]}\n---\nbody\n', '---\ntitle: L\nalso: {book-advanced: [303]}\n---\nbody\n']) {
      files['m/l/lesson.md'] = lesson;
      expect(() => load(mapFS(files))).toThrow();
    }
  });
});

describe('listening and dictation', () => {
  const src = 'audio_source: {title: "T", url: "https://tatoeba.org/x", author: "a", license: "CC BY-SA 4.0"}';
  const tts = 'audio_source: {title: edge-tts, url: "https://github.com/rany2/edge-tts", author: en-GB-SoniaNeural, license: TTS}';
  const item = 'items:\n  - q: "Who?"\n    options: [a, b]\n    answer: 0\n    explain: x\n';
  const loads = (exercise: string) => () =>
    load(mapFS({
      'm/module.yaml': 'title: M\n',
      'm/l/lesson.md': '---\ntitle: L\n---\n```exercise e\n```\n',
      'm/l/e/exercise.yaml': exercise,
      'audio/tts/1.mp3': 'ID3',
    }));
  const cases: [string, string, boolean][] = [
    ['local audio', 'title: L\ntype: listening\naudio: audio/tts/1.mp3\n' + tts + '\n' + item, true],
    ['link', 'title: L\ntype: listening\nlink: https://www.bbc.co.uk/learningenglish/x\naudio_source: {title: BBC, url: "https://www.bbc.co.uk/learningenglish", license: "©"}\n' + item, true],
    ['missing file', 'title: L\ntype: listening\naudio: audio/tts/2.mp3\n' + tts + '\n' + item, false],
    ['outside audio dir', 'title: L\ntype: listening\naudio: m/x.mp3\n' + tts + '\n' + item, false],
    ['closed license', 'title: L\ntype: listening\naudio: audio/tts/1.mp3\naudio_source: {title: T, url: "https://x", author: a, license: "CC BY-NC-ND 3.0"}\n' + item, false],
    ['TTS without voice', 'title: L\ntype: listening\naudio: audio/tts/1.mp3\naudio_source: {title: T, url: "https://x", license: TTS}\n' + item, false],
    ['CC BY without author', 'title: L\ntype: listening\naudio: audio/tts/1.mp3\naudio_source: {title: T, url: "https://x", license: "CC BY 4.0"}\n' + item, false],
    ['unknown link host', 'title: L\ntype: listening\nlink: https://example.com/a\naudio_source: {title: T, url: "https://x", license: "©"}\n' + item, false],
    ['audio and link', 'title: L\ntype: listening\naudio: audio/tts/1.mp3\nlink: https://www.bbc.co.uk/a\n' + tts + '\n' + item, false],
    ['audio on reading', 'title: R\ntype: reading\ntext: T\naudio: audio/tts/1.mp3\n' + item, false],
    ['dictation', 'title: D\ntype: dictation\nitems:\n  - audio: audio/tts/1.mp3\n    ' + src + '\n    answers: ["I have never been there."]\n    explain: x\n', true],
    ['dictation choice', 'title: D\ntype: dictation\nitems:\n  - audio: audio/tts/1.mp3\n    ' + tts + '\n    q: "Which word?"\n    options: ["ship", "sheep"]\n    answer: 0\n    explain: x\n', true],
    ['dictation without audio', 'title: D\ntype: dictation\nitems:\n  - answers: ["Yes."]\n    explain: x\n', false],
  ];
  for (const [name, yaml, ok] of cases) {
    it(name, () => (ok ? expect(loads(yaml)).not.toThrow() : expect(loads(yaml)).toThrow()));
  }
});

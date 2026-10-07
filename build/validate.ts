// npm run validate: loads the whole course, renders all of its markdown and
// checks what the loader cannot: every accepted answer is accepted by the
// checker, model answers fit their word limits, lessons cite sources.
import { text } from '../src/course/check.ts';
import { compile } from './compile.ts';
import { isChoice, load } from './content.ts';
import { dirFS } from './fs.ts';

const dir = process.argv[2] ?? 'content';
const problems: string[] = [];
const report = (msg: string) => problems.push(msg);

// Inline code and code blocks, where literal asterisks are legitimate.
const codeSpan = /<code[^>]*>[\s\S]*?<\/code>/g;

/** unrendered reports `**` that reached the page as text: by CommonMark rules
 * `**` after a letter and before punctuation does not open bold. */
function unrendered(where: string, html: string) {
  const t = html.replace(codeSpan, '');
  const i = t.indexOf('**');
  if (i >= 0) report(`${where}: unrendered ** near ${JSON.stringify(t.slice(Math.max(0, i - 30), i + 30))}`);
}

try {
  const course = load(dirFS(dir));
  const { index, lessons, cards } = compile(course);

  for (const m of course.modules) {
    if (m.lessons.length === 0) report(`${m.id}: module has no lessons`);
    for (const l of m.lessons) if (l.sources.length === 0) report(`${l.id}: no sources`);
  }

  for (const l of lessons.values()) {
    unrendered(l.id, l.theory + l.practice);
    for (const ex of l.exercises) {
      unrendered(ex.id, ex.intro + ex.text + ex.prompt + ex.modelAnswer);
      for (const it of ex.items) {
        unrendered(`${ex.id} item ${it.n}`, it.q + it.before + it.after + it.options.join('') + it.explain);
      }
    }
  }
  for (const c of cards) unrendered(`card ${c.id}`, c.q + c.a);

  let items = 0;
  for (const id of [...course.exercises.keys()].sort()) {
    const ex = course.exercises.get(id)!;
    if (!ex.lesson?.exercises.includes(ex)) report(`${id}: not referenced by its lesson (add \`\`\`exercise ${id})`);
    if (ex.type === 'writing') {
      const n = ex.model_answer.split(/\s+/).filter(Boolean).length;
      if (n < ex.words[0] || n > ex.words[1] + 20)
        report(`${id}: model answer has ${n} words, limit ${ex.words[0]}–${ex.words[1]}`);
    }
    ex.items.forEach((it, i) => {
      items++;
      const where = `${id} item ${i + 1}`;
      if (!it.explain) report(`${where}: no explain`);
      if (!isChoice(it) && !text(it.answers[0]!, it.answers))
        report(`${where}: first answer ${JSON.stringify(it.answers[0])} is not accepted`);
      if (ex.type === 'error' && text(it.q, it.answers))
        report(`${where}: the sentence with the error is already accepted as correct`);
    });
  }

  console.log(
    `${index.modules.length} modules, ${lessons.size} lessons, ${course.exercises.size} exercises, ${items} items, ${cards.length} cards`,
  );
  if (problems.length > 0) {
    for (const p of problems) console.log(`  ✗ ${p}`);
    console.error(`${problems.length} problem(s) found`);
    process.exit(1);
  }
  console.log('content OK');
} catch (e) {
  console.error((e as Error).message);
  process.exit(1);
}

// A submitted text: the prompt for feedback from Claude and a markdown copy.
import type { Exercise, Level } from './types.ts';

/** cefr is the CEFR level of an exam name: "B2 First" → "B2". */
const cefr = (exam: string) => exam.trim().split(/\s+/)[0] ?? exam;

/** claudePrompt is what the learner pastes into a chat with Claude for feedback. */
export function claudePrompt(ex: Exercise, lv: Level, text: string, words: number): string {
  let b = `Проверь мой текст на английском. Мой этап: ${lv.track}.\n\n`;
  b += '1. Дай исправленную версию текста целиком.\n';
  b += '2. Таблица ошибок: было → стало → почему (объяснение по-русски, с названием правила).\n';
  b += `3. Оцени по шкалам Cambridge ${lv.exam} Writing (0–5): Content, Communicative Achievement, Organisation, Language.\n`;
  if (ex.targetGrammar.length > 0) {
    b += `4. Как я использовал целевую грамматику (${ex.targetGrammar.join('; ')}): где верно, где можно было применить.\n`;
  } else {
    b += '4. Какие грамматические темы мне стоит повторить по этому тексту.\n';
  }
  b += `5. Предложи 3–5 слов или выражений уровня ${cefr(lv.exam)}, которые сделали бы текст сильнее, с примером в контексте.\n\n`;
  b += `Задание (${ex.words[0]}–${ex.words[1]} слов):\n${ex.promptText.trim()}\n\n`;
  b += `Мой текст (${words} слов):\n${text}\n`;
  return b;
}

/** writingDoc is the markdown copy of a submitted text, to keep or show Claude. */
export function writingDoc(
  ex: Exercise,
  lessonID: string,
  lv: Level,
  text: string,
  words: number,
  checked: boolean[],
  at: string,
): string {
  let b =
    `---\nexercise: ${ex.id}\ntitle: ${JSON.stringify(ex.title)}\nlesson: ${lessonID}\nlevel: ${lv.track}\n` +
    `exam: ${lv.exam}\ndate: ${at}\nwords: ${words}\nlimit: [${ex.words[0]}, ${ex.words[1]}]\n---\n\n`;
  b += `## Задание\n\n${ex.promptText.trim()}\n\n`;
  if (ex.targetGrammar.length > 0) b += `Целевая грамматика: ${ex.targetGrammar.join('; ')}\n\n`;
  b += '## Самопроверка\n\n';
  ex.checklist.forEach((c, i) => (b += `- [${checked[i] ? 'x' : ' '}] ${c}\n`));
  b += `\n## Текст\n\n${text}\n`;
  return b;
}

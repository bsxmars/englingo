// Lesson markdown → HTML with Aura classes. Fenced blocks with special info
// strings become widgets:
//
//	```quiz              YAML: q, options, answer (0-based), explain
//	```exercise <id>     marks where an exercise belongs; exercises live on the practice screen
import MarkdownIt from 'markdown-it';
import { parseYAML } from './yaml.ts';

const md = new MarkdownIt({ html: false, linkify: true, typographer: true });
// Only links with a scheme or www., as GFM autolinks: "rfi.fr" in a sentence stays text.
md.linkify.set({ fuzzyLink: false, fuzzyEmail: false });
// Typographer: dashes, ellipsis, «» and quotes, but no (c) → © or +- → ± — answers may contain them.
md.disable('replacements');
md.core.ruler.after('inline', 'dashes', (state) => {
  for (const block of state.tokens) {
    if (block.type !== 'inline' || !block.children) continue;
    let inLink = 0;
    for (const t of block.children) {
      if (t.type === 'link_open') inLink++;
      if (t.type === 'link_close') inLink--;
      if (t.type !== 'text' || inLink > 0) continue;
      t.content = t.content
        .replace(/(^|[^-])---(?=[^-]|$)/gm, '$1—')
        .replace(/(^|[^-])--(?=[^-]|$)/gm, '$1–')
        .replace(/\.\.\./g, '…')
        .replace(/<</g, '«')
        .replace(/>>/g, '»');
    }
  }
});

// ~~text~~ is <del>, as in GFM.
md.renderer.rules.s_open = () => '<del>';
md.renderer.rules.s_close = () => '</del>';

md.renderer.rules.fence = (tokens, idx) => {
  const t = tokens[idx]!;
  const lang = t.info.trim().split(/\s+/)[0] ?? '';
  switch (lang) {
    case 'exercise':
      // Exercises are shown on the practice screen, not inline.
      return '';
    case 'quiz':
      return quiz(t.content);
    default:
      return `<pre><code>${md.utils.escapeHtml(t.content)}</code></pre>\n`;
  }
};

/** Maps markdown-it's plain HTML onto Aura design system components. Idempotent. */
const AURA_CLASSES: [string, string][] = [
  ['<pre>', '<pre class="aura-code-block">'],
  ['<code>', '<code class="aura-code">'],
  ['<table>', '<div class="aura-table-wrap"><table class="aura-table">'],
  ['</table>', '</table></div>'],
  ['<blockquote>', '<div class="aura-alert aura-alert--accent" role="note"><div class="aura-alert__body">'],
  ['</blockquote>', '</div></div>'],
  ['<ul>', '<ul class="aura-list">'],
  ['<ol>', '<ol class="aura-list">'],
];
const AURA_RE = new RegExp(AURA_CLASSES.map(([from]) => from.replace(/[/]/g, '\\/')).join('|'), 'g');
const AURA_MAP = new Map(AURA_CLASSES);
const auraClasses = (html: string) => html.replace(AURA_RE, (m) => AURA_MAP.get(m)!);

/** markdown renders markdown to HTML with Aura classes. */
export function markdown(src: string): string {
  return auraClasses(md.render(glueBold(src)));
}

/** inline renders a short fragment without the wrapping paragraph, for questions and options. */
export function inline(src: string): string {
  const s = markdown(src).trim();
  if (s.startsWith('<p>') && s.split('<p>').length - 1 === 1) return s.slice(3).replace(/<\/p>$/, '');
  return s;
}

/** Invisible, and does not allow a line break. */
export const WORD_JOINER = '⁠';

const codeSpanSrc = /(`+)[^`]*?(`+)/g;
const wordChar = (r: string) => /[\p{L}\p{N}]/u.test(r);
const punct = (r: string) => r !== '*' && /[\p{P}\p{S}]/u.test(r);

// glueBold makes `**` open and close bold where CommonMark refuses to. Lessons
// mark the changing part of a word or a punctuation mark: j**'ai**, fell**;**,
// **d'**eau. By CommonMark rules `**` between a letter and punctuation is not
// flanking on the needed side, so it stays literal asterisks. A word joiner
// next to such a `**` fixes the flanking without changing what the reader sees.
// Openers are told from closers by their order in the line; fenced blocks and
// inline code are left alone.
export function glueBold(src: string): string {
  if (!src.includes('**')) return src;
  const lines = src.split(/(?<=\n)/);
  let fenced = false;
  return lines
    .map((line) => {
      const t = line.trim();
      if (t.startsWith('```') || t.startsWith('~~~')) {
        fenced = !fenced;
        return line;
      }
      return fenced || !line.includes('**') ? line : glueBoldLine(line);
    })
    .join('');
}

function glueBoldLine(line: string): string {
  const code = [...line.matchAll(codeSpanSrc)].map((m) => [m.index, m.index + m[0].length] as const);
  const inCode = (i: number) => code.some(([a, b]) => i >= a && i < b);
  let out = '';
  let n = 0; // `**` seen so far outside code: even — the next one opens
  for (let i = 0; i < line.length; i++) {
    if (line[i] !== '*' || line[i + 1] !== '*' || inCode(i)) {
      out += line[i];
      continue;
    }
    const before = [...line.slice(0, i)].at(-1) ?? '';
    const after = [...line.slice(i + 2)][0] ?? '';
    // A closer between punctuation and a letter (**d'**eau) is not right-flanking either.
    if (n % 2 === 1 && punct(before) && wordChar(after)) out += WORD_JOINER;
    out += '**';
    if (n % 2 === 0 && wordChar(before) && punct(after)) out += WORD_JOINER;
    n++;
    i++;
  }
  return out;
}

const escape = (s: string) => md.utils.escapeHtml(s);

function quiz(src: string): string {
  const data = (parseYAML(src) ?? {}) as { q?: unknown; options?: unknown; answer?: unknown; explain?: unknown };
  const q = String(data.q ?? '');
  const options = Array.isArray(data.options) ? data.options.map((o) => String(o ?? '')) : [];
  const answer = Number(data.answer ?? 0);
  if (!Number.isInteger(answer) || answer < 0 || answer >= options.length)
    throw new Error(`quiz "${q}": answer ${String(data.answer)} out of range`);
  let html =
    '<div class="aura-card quiz"><div class="aura-stack" style="--aura-gap: var(--space-3)">' +
    '<div class="quiz-q"><span class="aura-badge aura-badge--info">Вопрос</span>' +
    markdown(q) +
    '</div><div class="aura-group quiz-options">';
  options.forEach((opt, i) => {
    html += `<button class="aura-btn aura-btn--secondary quiz-opt" type="button" data-correct="${i === answer}">${inline(opt)}</button>`;
  });
  html +=
    '</div><div class="aura-alert aura-alert--success quiz-explain" hidden>' +
    `<div class="aura-alert__body"><div class="aura-alert__title">Верно</div>${markdown(String(data.explain ?? ''))}</div></div></div></div>`;
  return html;
}

export { escape as escapeHtml };

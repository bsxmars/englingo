// Compares a learner's typed answer with the accepted answers of an exercise
// item. Comparison is forgiving about things that are not the point of a
// grammar exercise: case, extra spaces, curly apostrophes, commas, final
// punctuation and contractions ("I've" = "I have", "can't" = "cannot").

const QUOTES: Record<string, string> = {
  '’': "'", '‘': "'", '`': "'", '´': "'", 'ʼ': "'",
  '“': '"', '”': '"', '«': '"', '»': '"',
  '\u00a0': ' ', '\u202f': ' ', '\u2009': ' ', // non-breaking and thin spaces
};
const QUOTES_RE = new RegExp(`[${Object.keys(QUOTES).join('')}]`, 'g');

// Order matters: irregular negatives before the generic n't.
const CONTRACTIONS: [string, string][] = [
  ["won't", 'will not'],
  ["shan't", 'shall not'],
  ["can't", 'can not'],
  ['cannot', 'can not'],
  ["n't", ' not'],
  ["'m", ' am'],
  ["'re", ' are'],
  ["'ve", ' have'],
  ["'ll", ' will'],
];
const CONTRACTIONS_RE = new RegExp(CONTRACTIONS.map(([c]) => c).join('|'), 'g');
const CONTRACTIONS_MAP = new Map(CONTRACTIONS);

const EDGE = /^[".!?;:\s]+|[".!?;:\s]+$/g;

/** normalize lowercases s, unifies quotes, expands unambiguous contractions
 * and drops commas, surrounding quotes and final punctuation. */
export function normalize(s: string): string {
  s = s.toLowerCase().replace(QUOTES_RE, (c) => QUOTES[c]!);
  s = s.replace(CONTRACTIONS_RE, (c) => CONTRACTIONS_MAP.get(c)!);
  s = s.replaceAll(',', ' ');
  s = s.split(/\s+/).filter(Boolean).join(' ');
  return s.replace(EDGE, '');
}

/** The words after which 's is a verb, not a possessive. */
const S_PRONOUNS = new Set([
  'it', 'that', 'there', 'here', 'what', 'who', 'where', 'when', 'how', 'he', 'she', 'this',
  'everything', 'nothing', 'something', 'everyone', 'nobody',
]);

/** expand replaces every contraction suffix with each expansion in turn, but
 * only after the words in only (any word when only is null). */
function expand(forms: string[], suffix: string, expansions: string[], only: Set<string> | null): string[] {
  const out: string[] = [];
  for (const f of forms) {
    const words = f.split(' ').filter(Boolean);
    const hit = (w: string) => {
      if (!w.endsWith(suffix)) return false;
      const stem = w.slice(0, -suffix.length);
      return stem !== '' && (only === null || only.has(stem));
    };
    if (!words.some(hit)) {
      out.push(f);
      continue;
    }
    for (const e of expansions) {
      out.push(normalize(words.map((w) => (hit(w) ? w.slice(0, -suffix.length) + e : w)).join(' ')));
    }
  }
  return out;
}

/** forms returns the normalized forms of s. There is more than one when a
 * contraction is ambiguous: "'d" is both "had" and "would", and "'s" after a
 * pronoun is both "is" and "has" ("it's raining", "it's been raining").
 * Possessive 's ("John's car") is left alone. */
export function forms(s: string): string[] {
  let out = [normalize(s)];
  out = expand(out, "'d", [' had', ' would'], null);
  out = expand(out, "'s", [' is', ' has'], S_PRONOUNS);
  return out;
}

/** text reports whether given matches any of the accepted answers. */
export function text(given: string, answers: string[]): boolean {
  const got = new Set(forms(given));
  return answers.some((a) => forms(a).some((f) => got.has(f)));
}

/** choice reports whether given (an option index) is answer. */
export function choice(given: string, answer: number): boolean {
  const t = given.trim();
  return /^[-+]?\d+$/.test(t) && Number(t) === answer;
}

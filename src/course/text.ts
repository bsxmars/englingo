/** plural picks the Russian form for n: 1 слово, 2 слова, 5 слов. */
export function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

export const pct = (a: number, b: number) => (b === 0 ? 0 : Math.floor((a * 100) / b));

export const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/** Local calendar date as YYYY-MM-DD. */
export function day(t: number | Date): string {
  const d = new Date(t);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** The badge of a lesson kind in the course map. */
export const KIND: Record<string, string> = {
  reading: 'чтение',
  writing: 'письмо',
  listening: 'аудирование',
  test: 'тест',
};

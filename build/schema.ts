// Schemas of the content files. Strict ones (books, exercises) reject unknown
// fields, so a typo (anwers:) fails loudly instead of silently dropping data.
import { z } from 'zod';

/** A string field: missing or null is "". */
const str = z.string().nullish().transform((v) => v ?? '');
/** An integer field: missing or null is 0. */
const int = z
  .union([z.string().regex(/^[-+]?\d+$/, 'expected an integer'), z.number().int()])
  .nullish()
  .transform((v) => (v == null ? 0 : Number(v)));
const strs = z.array(str).nullish().transform((v) => v ?? []);

const source = z.object({ title: str, url: str });
const sources = z.array(source).nullish().transform((v) => v ?? []);

export const unitSchema = z.strictObject({
  n: int,
  label: str,
  title: str,
  page: int,
  extra: int,
  ex: str,
});

export const bookSchema = z.strictObject({
  title: str,
  author: str,
  key_page: int,
  extra_title: str,
  extra_key_page: int,
  units: z.array(unitSchema).nullish().transform((v) => v ?? []),
});

export const moduleSchema = z.object({
  level: str,
  book: str,
  title: str,
  summary: str,
  topics: strs,
  sources,
});

export const lessonSchema = z.object({
  title: str,
  kind: str,
  sources,
  book: z.array(int).nullish().transform((v) => v ?? []),
  also: z
    .record(z.string(), z.array(int))
    .nullish()
    .transform((v) => v ?? {}),
});

export const audioSourceSchema = z.strictObject({
  title: str,
  url: str,
  author: str,
  license: str,
});

export const itemSchema = z.strictObject({
  q: str,
  key: str,
  stem: str,
  options: strs,
  answer: int,
  answers: strs,
  explain: str,
  topic: str,
  audio: str,
  audio_source: audioSourceSchema.nullish().transform((v) => v ?? null),
});

export const exerciseSchema = z.strictObject({
  title: str,
  type: str,
  intro: str,
  hints: strs,
  text: str,
  audio: str,
  link: str,
  transcript: str,
  audio_source: audioSourceSchema.nullish().transform((v) => v ?? null),
  items: z.array(itemSchema).nullish().transform((v) => v ?? []),
  pass: int,
  prompt: str,
  words: z
    .tuple([int, int])
    .nullish()
    .transform((v) => v ?? ([0, 0] as [number, number])),
  target_grammar: strs,
  checklist: strs,
  model_answer: str,
});

export const cardSchema = z.object({ id: str, lesson: str, q: str, a: str });
export const cardsSchema = z.array(cardSchema).nullish().transform((v) => v ?? []);

export type Unit = z.infer<typeof unitSchema>;
export type BookFile = z.infer<typeof bookSchema>;
export type ModuleFile = z.infer<typeof moduleSchema>;
export type LessonFront = z.infer<typeof lessonSchema>;
export type AudioSource = z.infer<typeof audioSourceSchema>;
export type ItemFile = z.infer<typeof itemSchema>;
export type ExerciseFile = z.infer<typeof exerciseSchema>;
export type CardFile = z.infer<typeof cardSchema>;
export type Source = z.infer<typeof source>;

/** Parses data with schema; the error names the first bad field. */
export function decode<T extends z.ZodType>(schema: T, data: unknown, name: string): z.output<T> {
  const r = schema.safeParse(data);
  if (!r.success) {
    const issue = r.error.issues[0]!;
    const where = issue.path.length ? issue.path.join('.') + ': ' : '';
    const msg =
      issue.code === 'unrecognized_keys' ? `field ${issue.keys.join(', ')} not found` : issue.message;
    throw new Error(`${name}: ${where}${msg}`);
  }
  return r.data;
}

// The course as the build (build/course-plugin.ts) hands it to the app.
// Markdown fields are already HTML; strings named *Text are raw.

export interface Level {
  code: string;
  track: string; // B1 → B2
  exam: string; // B2 First
}

export interface Source {
  title: string;
  url: string;
}

export type ExerciseType =
  | 'gap'
  | 'choice'
  | 'transform'
  | 'error'
  | 'order'
  | 'reading'
  | 'writing';

/** What the course map and progress need to know about an exercise. */
export interface ExerciseMeta {
  id: string;
  title: string;
  type: ExerciseType;
  /** Per item: the module id it tests; empty for ordinary exercises. */
  topics: string[];
}

export interface LessonMeta {
  id: string; // "<module>/<lesson>"
  title: string;
  kind: string; // grammar (""), reading, writing or test
  module: string;
  prev: string | null;
  next: string | null;
  exercises: ExerciseMeta[];
}

export interface ModuleMeta {
  id: string;
  level: string;
  title: string;
  summary: string;
  topics: string[];
  sources: Source[];
  lessons: string[];
}

export interface CourseIndex {
  levels: Level[]; // in course order
  modules: ModuleMeta[];
  lessons: Record<string, LessonMeta>;
  /** Cards unlock when their lesson is done; the text is in the cards chunk. */
  cards: { id: string; lesson: string }[];
}

export interface Card {
  id: string;
  lesson: string;
  q: string;
  a: string;
}

export interface BookUnit {
  name: string; // "Unit 11" or a label: "3.2"
  title: string;
  page: number;
  extra: number; // page in the companion exercise book
  ex: string; // which of the book's exercises to do
}

export interface BookRefs {
  title: string;
  author: string;
  keyPage: number;
  extraTitle: string;
  extraKeyPage: number;
  units: BookUnit[];
}

export interface Item {
  n: number;
  choice: boolean;
  q: string;
  /** A gap inside the sentence: before ___ after. */
  inline: boolean;
  before: string;
  after: string;
  key: string;
  options: string[];
  prefill: string; // error: the sentence to correct
  words: string[]; // order: the words, shuffled
  // Checking.
  answer: number; // choice: index of the right option
  answers: string[]; // typed: every accepted answer
  expected: string; // the right answer as shown
  explain: string;
  topic: string;
}

export interface Exercise {
  id: string;
  title: string;
  type: ExerciseType;
  intro: string;
  hints: string[];
  text: string; // reading passage
  items: Item[];
  /** How many items must be right for the exercise to count as solved. */
  pass: number;
  // Writing.
  prompt: string;
  promptText: string;
  words: [number, number];
  targetGrammar: string[];
  checklist: string[];
  modelAnswer: string;
}

export interface LessonData {
  id: string;
  theory: string;
  practice: string; // intro above the exercises
  refs: BookRefs[];
  sources: Source[];
  exercises: Exercise[];
}

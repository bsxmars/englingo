// Types of `virtual:course`, which build/course-plugin.ts generates (tsconfig paths point here).
import type { Card, CourseIndex, LessonData } from './types.ts';

declare const course: CourseIndex;
export default course;
export declare function loadLesson(id: string): Promise<LessonData | null>;
export declare function loadCards(): Promise<Card[]>;

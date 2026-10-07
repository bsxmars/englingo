// Which cards are due for review.
import type { ProgressData } from './progress.ts';
import { newCardsSince } from './progress.ts';
import type { CourseIndex } from './types.ts';
import { levelOf } from './levels.ts';

/** How many never-seen cards a day brings in. */
export const MAX_NEW_PER_DAY = 15;

/** dueCards returns ids of cards ready for review: unlocked by a finished
 * lesson of the level and either never seen (within today's quota) or past
 * their due time. Overdue cards come first. */
export function dueCards(c: CourseIndex, p: ProgressData, level: string | null, now: number): string[] {
  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);
  const quota = MAX_NEW_PER_DAY - newCardsSince(p, midnight.getTime());
  const old: string[] = [];
  const fresh: string[] = [];
  for (const card of c.cards) {
    if (!(card.lesson in p.lessonsDone)) continue;
    if (level && levelOf(c, card.lesson) !== level) continue;
    const st = p.cards[card.id];
    if (!st && fresh.length < quota) fresh.push(card.id);
    else if (st && st.due <= now) old.push(card.id);
  }
  old.sort((a, b) => p.cards[a]!.due - p.cards[b]!.due);
  return [...old, ...fresh];
}

// The SM-2 spaced repetition schedule.

/** How well a card was recalled. */
export const Grade = { Again: 1, Hard: 3, Good: 4, Easy: 5 } as const;
export type Grade = (typeof Grade)[keyof typeof Grade];

/** The scheduling state of one card. */
export interface CardState {
  ease: number; // starts at 2.5, never below 1.3
  interval: number; // days
  reps: number; // consecutive successful reviews
  due: number; // ms since epoch
}

export const newCard = (): CardState => ({ ease: 2.5, interval: 0, reps: 0, due: 0 });

/** review returns the next state after answering with grade at time now (ms). */
export function review(s: CardState, g: Grade, now: number): CardState {
  let { ease, interval, reps } = s;
  if (ease === 0) ease = 2.5;
  const q = g;
  if (g < Grade.Hard) {
    reps = 0;
    interval = 0;
  } else {
    if (reps === 0) interval = 1;
    else if (reps === 1) interval = 6;
    else interval = Math.round(interval * ease);
    reps++;
  }
  ease = Math.max(1.3, ease + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  let due: number;
  if (interval === 0) {
    // Forgotten cards come back in the same session.
    due = now + 10 * 60_000;
  } else {
    const d = new Date(now);
    d.setDate(d.getDate() + interval);
    due = d.getTime();
  }
  return { ease, interval, reps, due };
}

export const REVEAL_WINDOW_SECONDS = 30 * 60;
export const WEEKEND_REVEAL_WINDOW_SECONDS = 15 * 60;
export const WEEKEND_MULTIPLIER = 1.5;
export const MAX_SCORE = 100;

export function getMultiplier(isWeekendSpecial: boolean): number {
  return isWeekendSpecial ? WEEKEND_MULTIPLIER : 1;
}

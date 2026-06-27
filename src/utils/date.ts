const TIMEZONE = "Europe/Madrid";
const NEW_CHALLENGE_HOUR = 10;

function toMadridDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(date);
}

export function getActiveChallengeDate(): string {
  const now = new Date();

  const hour = parseInt(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TIMEZONE,
      hour: "numeric",
      hour12: false,
    }).format(now)
  );

  const targetDate =
    hour < NEW_CHALLENGE_HOUR ? new Date(now.getTime() - 24 * 60 * 60 * 1000) : now;

  return toMadridDate(targetDate);
}

export function getWeekStartDate(): string {
  const now = new Date();
  const dayOfWeek = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    weekday: "short",
  }).format(now);
  const daysFromMonday: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };
  const offset = (daysFromMonday[dayOfWeek] ?? 0) * 24 * 60 * 60 * 1000;
  return toMadridDate(new Date(now.getTime() - offset));
}

export function getMonthStartDate(): string {
  const [year, month] = toMadridDate(new Date()).split("-");
  return `${year}-${month}-01`;
}

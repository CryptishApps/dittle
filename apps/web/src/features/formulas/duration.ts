const ISO_DURATION = /^P(?:(\d+(?:\.\d+)?)W)?(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/;
const UNIT_SECONDS = [604_800, 86_400, 3_600, 60, 1] as const;

export const MINUTE = 60;
export const HOUR = 3_600;
export const DAY = 86_400;

export function parseIsoDuration(text: string): number | undefined {
  const match = ISO_DURATION.exec(text);
  if (!match || text.endsWith("T")) return undefined;
  const parts = match.slice(1);
  if (parts.every((part) => part === undefined)) return undefined;
  return parts.reduce((total, part, index) => total + (part === undefined ? 0 : Number(part) * UNIT_SECONDS[index]!), 0);
}

export type DurationParts = { hours: number; minutes: number; seconds: number };

export function splitDuration(total: number): DurationParts {
  const whole = Math.round(total);
  return { hours: Math.floor(whole / HOUR), minutes: Math.floor((whole % HOUR) / MINUTE), seconds: whole % MINUTE };
}

export const joinDuration = ({ hours, minutes, seconds }: DurationParts): number => hours * HOUR + minutes * MINUTE + seconds;

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

export function formatDuration(total: number): string {
  if (total < MINUTE) return `${Math.round(total * 100) / 100} s`;
  const whole = Math.round(total);
  if (whole >= DAY && whole % DAY === 0) return plural(whole / DAY, "day");
  const { hours, minutes, seconds } = splitDuration(whole);
  if (hours === 0) return seconds === 0 ? `${minutes} min` : `${minutes}:${String(seconds).padStart(2, "0")}`;
  return [`${hours} h`, minutes ? `${minutes} min` : "", seconds ? `${seconds} s` : ""].filter(Boolean).join(" ");
}

const DIGITS = "0123456789";

export const REEL_CELLS = [...DIGITS, ...DIGITS, ...DIGITS];

export type ReelColumn = { kind: "reel"; from: number; to: number } | { kind: "still"; char: string };

const digitOf = (char: string | undefined) => (char === undefined ? -1 : DIGITS.indexOf(char));

export function reelColumns(from: string, to: string): ReelColumn[] {
  const before = [...from];
  const after = [...to];
  const shift = before.length - after.length;
  return after.map((char, index): ReelColumn => {
    const digit = digitOf(char);
    if (digit < 0) return { kind: "still", char };
    const old = digitOf(before[index + shift]);
    if (old === digit) return { kind: "reel", from: digit, to: digit };
    return { kind: "reel", from: Math.max(old, 0), to: DIGITS.length + digit };
  });
}

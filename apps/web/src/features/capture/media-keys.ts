export type EditableTarget = { tagName?: string; isContentEditable?: boolean } | null | undefined;

export type KeyLike = {
  key: string;
  code?: string;
  repeat?: boolean;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  target?: EditableTarget;
};

const EDITABLE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

export function isEditable(target: EditableTarget): boolean {
  if (!target) return false;
  return target.isContentEditable === true || EDITABLE_TAGS.has((target.tagName ?? "").toUpperCase());
}

export function isTalkKey(event: KeyLike): boolean {
  return event.code === "KeyM" || event.key === "m" || event.key === "M";
}

export function isPushToTalk(event: KeyLike): boolean {
  if (!isTalkKey(event) || event.repeat) return false;
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return false;
  return !isEditable(event.target);
}

export function formatElapsed(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export const HOLD_MS = 400;

export function releaseStops(heldMs: number): boolean {
  return heldMs >= HOLD_MS;
}

export function meterLevel(rms: number): number {
  return Math.min(1, Math.sqrt(Math.max(0, rms)) * 1.8);
}

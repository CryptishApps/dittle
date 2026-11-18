export function readMediaAnswer(text: string): string {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return "";
  }
  const value = data && typeof data === "object" ? (data as { text?: unknown }).text : undefined;
  if (typeof value !== "string") return "";
  return value
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

export function fitWithin(width: number, height: number, max: number): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= max) return { width, height };
  const scale = max / longest;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export function baseMimeType(type: string): string {
  return type.split(";")[0]!.trim();
}

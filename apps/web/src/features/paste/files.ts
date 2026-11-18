import { useEffect } from "react";

export const FILE_TYPES = ["image/png", "image/jpeg", "image/webp", "application/pdf"];
export const MAX_FILE_BYTES = 14 * 1024 * 1024;

export type PasteInput = { text?: string; file?: File };

export const isReadable = (file: File) => FILE_TYPES.includes(file.type) && file.size <= MAX_FILE_BYTES;

export function fileData(file: File): Promise<{ mimeType: string; data: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error(`Could not read ${file.name}`));
    reader.onload = () => {
      const url = String(reader.result);
      resolve({ mimeType: file.type, data: url.slice(url.indexOf(",") + 1) });
    };
    reader.readAsDataURL(file);
  });
}

const typingIn = (target: EventTarget | null) => target instanceof Element && target.closest("input, textarea, select, [contenteditable]") !== null;

export function usePasteAnywhere(open: (input: PasteInput) => void): void {
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (event.defaultPrevented || typingIn(event.target)) return;
      const file = [...(event.clipboardData?.files ?? [])].find((item) => FILE_TYPES.includes(item.type));
      const text = event.clipboardData?.getData("text/plain").trim() ?? "";
      if (!file && !text) return;
      event.preventDefault();
      open(file ? { file } : { text });
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [open]);
}

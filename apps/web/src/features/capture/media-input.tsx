import type { ReactNode } from "react";

export function MicButton(_: { onText: (text: string) => void }) {
  return null;
}

export function ImageDropZone({ children }: { onText: (text: string) => void; children: ReactNode }) {
  return <>{children}</>;
}

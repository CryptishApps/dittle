import { useEffect, useState } from "react";

const GAP_MS = 45;

export function useStreamedWords(total: number, running: boolean): number {
  const [shown, setShown] = useState(running ? 0 : total);
  useEffect(() => {
    if (!running) return;
    setShown(0);
    const timer = window.setInterval(() => {
      setShown((count) => {
        if (count >= total) window.clearInterval(timer);
        return Math.min(count + 1, total);
      });
    }, GAP_MS);
    return () => window.clearInterval(timer);
  }, [running, total]);
  return shown;
}

export function StreamedText({ words, offset, shown }: { words: string[]; offset: number; shown: number }) {
  return (
    <>
      {words.map((word, index) => (
        <span key={index}>
          <span className={offset + index < shown ? "t-stream-w is-in" : "t-stream-w"}>{word}</span>
          {index < words.length - 1 ? " " : ""}
        </span>
      ))}
    </>
  );
}

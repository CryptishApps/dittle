import { useState } from "react";

export function Reprint({ value }: { value: string }) {
  const [shown, setShown] = useState(value);
  const [printCount, setPrintCount] = useState(0);
  if (value !== shown) {
    setShown(value);
    setPrintCount((count) => count + 1);
  }

  const printing = printCount > 0;
  const chars = [...value];
  return (
    <span key={printCount} className="reprint" data-value={value} data-printing={printing}>
      <span className={printing ? "t-digit-group is-animating" : "t-digit-group"}>
        {chars.map((char, index) => (
          <span key={index} className="t-digit" data-stagger={staggerFor(index, chars.length)}>
            {char === " " ? " " : char}
          </span>
        ))}
      </span>
    </span>
  );
}

function staggerFor(index: number, length: number): string | undefined {
  if (index === length - 1) return "2";
  if (index === length - 2) return "1";
  return undefined;
}

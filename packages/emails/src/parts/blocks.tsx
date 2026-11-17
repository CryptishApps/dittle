import type { ReactNode } from "react";
import { Button, Heading, Text } from "react-email";
import { fonts, light } from "../brand";

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <Text className="faint" style={{ margin: "0 0 10px", fontFamily: fonts.mono, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: light.faint }}>
      {children}
    </Text>
  );
}

export function Title({ children }: { children: ReactNode }) {
  return (
    <Heading as="h1" className="ink" style={{ margin: "0 0 12px", fontSize: 24, lineHeight: "31px", fontWeight: 600, letterSpacing: "-0.01em", color: light.ink }}>
      {children}
    </Heading>
  );
}

export function Para({ children }: { children: ReactNode }) {
  return (
    <Text className="soft" style={{ margin: "0 0 16px", fontSize: 15, lineHeight: "24px", color: light.soft }}>
      {children}
    </Text>
  );
}

export function Action({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Button
      className="button"
      href={href}
      style={{ display: "inline-block", marginTop: 8, backgroundColor: light.ink, color: light.card, fontFamily: fonts.mono, fontSize: 13, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", padding: "13px 20px", borderRadius: 4, textDecoration: "none" }}
    >
      {children}
    </Button>
  );
}

export function Fallback({ href }: { href: string }) {
  return (
    <Text className="faint" style={{ margin: "22px 0 0", fontSize: 12, lineHeight: "18px", color: light.faint, wordBreak: "break-all" }}>
      Button not working? Paste this into your browser: {href}
    </Text>
  );
}

export function Value({ children }: { children: ReactNode }) {
  return (
    <span className="tint" style={{ fontFamily: fonts.mono, fontSize: "0.92em", backgroundColor: light.accentTint, color: light.accentInk, padding: "1px 5px", borderRadius: 3 }}>
      {children}
    </span>
  );
}

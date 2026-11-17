import type { ReactNode } from "react";
import { Button, Heading, Section, Text } from "react-email";
import { light } from "../brand";

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <Text className="quiet" style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: light.quiet }}>
      {children}
    </Text>
  );
}

export function Title({ children, after }: { children: ReactNode; after?: ReactNode }) {
  return (
    <Heading as="h1" style={{ margin: "0 0 18px", fontSize: 30, lineHeight: "35px", fontWeight: 650, letterSpacing: "-0.03em" }}>
      <span className="ink" style={{ color: light.ink }}>
        {children}
      </span>
      {after && (
        <>
          {" "}
          <span className="quiet" style={{ color: light.quiet }}>
            {after}
          </span>
        </>
      )}
    </Heading>
  );
}

export function Para({ children }: { children: ReactNode }) {
  return (
    <Text className="soft" style={{ margin: "0 0 18px", fontSize: 16, lineHeight: "27px", color: light.soft }}>
      {children}
    </Text>
  );
}

export function Action({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Button
      className="button"
      href={href}
      style={{
        display: "inline-block",
        marginTop: 6,
        backgroundColor: light.accent,
        color: light.onAccent,
        fontSize: 16,
        fontWeight: 600,
        padding: "14px 24px",
        borderRadius: 12,
        textDecoration: "none",
        boxShadow: "0 10px 22px -10px rgba(31,95,240,0.7)",
      }}
    >
      {children}
    </Button>
  );
}

export function Fallback({ href }: { href: string }) {
  return (
    <Text className="quiet" style={{ margin: "22px 0 0", fontSize: 13, lineHeight: "20px", color: light.quiet, wordBreak: "break-all" }}>
      Button not working? Paste this into your browser:{" "}
      <a className="link" href={href} style={{ color: light.accentInk }}>
        {href}
      </a>
    </Text>
  );
}

export function Key({ children, fresh = false }: { children: ReactNode; fresh?: boolean }) {
  return (
    <span
      className={fresh ? "key-fresh" : "key"}
      style={{
        display: "inline-block",
        padding: "0 6px",
        margin: "0 1px",
        borderRadius: 7,
        border: `1px solid ${fresh ? light.accentLine : light.keyEdge}`,
        borderBottomWidth: 2.5,
        backgroundColor: fresh ? light.accentTint : light.key,
        color: fresh ? light.accentInk : light.ink,
        fontWeight: 600,
        lineHeight: "22px",
      }}
    >
      {children}
    </span>
  );
}

export function Sticky({ from, children }: { from: string; children: ReactNode }) {
  return (
    <Section className="sticky" style={{ margin: "4px 0 24px", backgroundColor: light.sticky, borderRadius: 14, padding: "16px 20px 18px", transform: "rotate(-1deg)", boxShadow: "0 14px 24px -16px rgba(90,70,0,0.55)" }}>
      <Text style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: light.stickySoft }}>{from}</Text>
      <Text style={{ margin: 0, fontSize: 16, lineHeight: "24px", fontWeight: 500, color: light.stickyInk }}>{children}</Text>
    </Section>
  );
}

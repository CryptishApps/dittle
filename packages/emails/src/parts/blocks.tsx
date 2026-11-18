import type { ReactNode } from "react";
import { Button, Heading, Section, Text } from "react-email";
import { light } from "../brand";

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <Text className="quiet" style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 500, color: light.quiet }}>
      {children}
    </Text>
  );
}

export function Title({ children, after }: { children: ReactNode; after?: ReactNode }) {
  return (
    <Heading as="h1" style={{ margin: "0 0 18px", fontSize: 26, lineHeight: "33px", fontWeight: 600, letterSpacing: "-0.02em" }}>
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
    <Text className="soft" style={{ margin: "0 0 20px", fontSize: 16, lineHeight: "26px", color: light.soft }}>
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
        marginTop: 4,
        backgroundColor: light.ink,
        color: light.onInk,
        fontSize: 15,
        fontWeight: 600,
        padding: "12px 20px",
        borderRadius: 10,
        textDecoration: "none",
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
      <a className="link" href={href} style={{ color: light.link }}>
        {href}
      </a>
    </Text>
  );
}

export function Value({ children }: { children: ReactNode }) {
  return (
    <span className="value" style={{ display: "inline-block", padding: "0 5px", borderRadius: 5, backgroundColor: light.value, color: light.valueInk, fontWeight: 600, lineHeight: "22px" }}>
      {children}
    </span>
  );
}

export function Quote({ from, children }: { from: string; children: ReactNode }) {
  return (
    <Section className="panel" style={{ margin: "4px 0 24px", backgroundColor: light.panel, borderRadius: 12, padding: "14px 18px 16px" }}>
      <Text className="quiet" style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 500, color: light.quiet }}>
        {from}
      </Text>
      <Text className="ink" style={{ margin: 0, fontSize: 16, lineHeight: "24px", color: light.ink }}>
        {children}
      </Text>
    </Section>
  );
}

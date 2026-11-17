import type { CSSProperties, ReactNode } from "react";
import { Body, Container, Head, Html, Img, Link, Preview, Section, Text } from "react-email";
import { dark, FONT, FONT_FILE, light, MARK, SITE } from "../brand";

const dotted = (dots: string) => `radial-gradient(${dots} 1px, transparent 1.2px)`;

const styles = `
@font-face { font-family: Figtree; font-style: normal; font-weight: 300 900; src: url(${FONT_FILE}) format("woff2"); }
body { margin: 0; background-color: ${light.canvas}; }
:root { color-scheme: light dark; supported-color-schemes: light dark; }
@media (prefers-color-scheme: dark) {
  body, .canvas { background-color: ${dark.canvas} !important; background-image: ${dotted(dark.dots)} !important; }
  .sheet { background-color: ${dark.sheet} !important; border-color: ${dark.line} !important; box-shadow: none !important; }
  .folder { background-color: ${dark.folder} !important; }
  .note { background-color: ${dark.sheet} !important; border-color: ${dark.line} !important; }
  .ink { color: ${dark.ink} !important; }
  .soft { color: ${dark.soft} !important; }
  .quiet { color: ${dark.quiet} !important; }
  .line { border-color: ${dark.line} !important; }
  .key { background-color: ${dark.key} !important; border-color: ${dark.keyEdge} !important; color: ${dark.ink} !important; }
  .key-fresh { background-color: ${dark.accentTint} !important; border-color: ${dark.accentLine} !important; color: ${dark.accentInk} !important; }
  .button { background-color: ${dark.accent} !important; color: ${dark.onAccent} !important; }
  .link { color: ${dark.accentInk} !important; }
  .sticky { background-color: ${dark.sticky} !important; }
  .mark-light { display: none !important; }
  .mark-dark { display: inline-block !important; }
}`;

export function Layout({ preview, children, footer }: { preview: string; children: ReactNode; footer: ReactNode }) {
  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        <style>{styles}</style>
      </Head>
      <Preview>{preview}</Preview>
      <Body style={{ margin: 0, fontFamily: FONT }}>
        <Section className="canvas" style={{ backgroundColor: light.canvas, backgroundImage: dotted(light.dots), backgroundSize: "9px 9px", padding: "36px 12px 44px" }}>
          <Container style={{ maxWidth: 560, margin: "0 auto" }}>
            <Section style={{ padding: "0 6px 20px" }}>
              <Link href={SITE} style={{ textDecoration: "none" }}>
                <Img className="mark-light" src={MARK.light} width={24} height={24} alt="" style={{ display: "inline-block", verticalAlign: "middle" }} />
                <Img className="mark-dark" src={MARK.dark} width={24} height={24} alt="" style={{ display: "none", verticalAlign: "middle", msoHide: "all" } as CSSProperties} />
                <span className="ink" style={{ display: "inline-block", verticalAlign: "middle", marginLeft: 9, fontSize: 21, fontWeight: 600, letterSpacing: "-0.025em", color: light.ink }}>
                  Dittle
                </span>
              </Link>
            </Section>
            <Section
              className="sheet"
              style={{ backgroundColor: light.sheet, border: `1px solid ${light.line}`, borderRadius: 24, padding: "36px 36px 34px", boxShadow: "0 40px 60px -42px rgba(18,20,24,0.32)" }}
            >
              {children}
            </Section>
            <Section style={{ padding: "22px 8px 0" }}>
              <Text className="quiet" style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: light.quiet }}>
                {footer}
              </Text>
              <Text className="quiet" style={{ margin: "12px 0 0", fontSize: 13, fontWeight: 600, color: light.quiet }}>
                Dittle · Plans in plain notes ·{" "}
                <Link className="quiet" href={SITE} style={{ color: light.quiet, textDecoration: "underline" }}>
                  dittle.app
                </Link>
              </Text>
            </Section>
          </Container>
        </Section>
      </Body>
    </Html>
  );
}

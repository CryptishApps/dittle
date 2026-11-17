import type { ReactNode } from "react";
import { Body, Container, Head, Html, Img, Link, Preview, Section, Text } from "react-email";
import { dark, fonts, light, LOGO, MONO_FONT_FILE, SITE } from "../brand";

const styles = `
@font-face { font-family: "Geist Mono"; font-style: normal; font-weight: 100 900; src: url(${MONO_FONT_FILE}) format("woff2"); }
body { margin: 0; background-color: ${light.page}; }
:root { color-scheme: light dark; supported-color-schemes: light dark; }
@media (prefers-color-scheme: dark) {
  body, .page { background-color: ${dark.page} !important; }
  .card { background-color: ${dark.card} !important; border-color: ${dark.line} !important; }
  .ink { color: ${dark.ink} !important; }
  .soft { color: ${dark.soft} !important; }
  .faint { color: ${dark.faint} !important; }
  .chip { background-color: ${dark.chip} !important; color: ${dark.ink} !important; }
  .line { border-color: ${dark.line} !important; }
  .button { background-color: ${dark.ink} !important; color: ${dark.page} !important; }
  .accent { color: ${dark.accentInk} !important; }
  .logo { outline: 1px solid ${dark.line} !important; }
  .tint { background-color: ${dark.accentTint} !important; color: ${dark.accentInk} !important; }
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
      <Body style={{ margin: 0, fontFamily: fonts.text }}>
        <Section className="page" style={{ backgroundColor: light.page, padding: "40px 12px" }}>
          <Container style={{ maxWidth: 520, margin: "0 auto" }}>
            <Section style={{ padding: "0 4px 18px" }}>
              <Link href={SITE} style={{ textDecoration: "none" }}>
                <Img className="logo" src={LOGO} width={28} height={28} alt="" style={{ display: "inline-block", verticalAlign: "middle", borderRadius: 4 }} />
                <span className="ink" style={{ display: "inline-block", verticalAlign: "middle", marginLeft: 10, fontFamily: fonts.mono, fontSize: 13, fontWeight: 500, letterSpacing: "0.08em", color: light.ink }}>
                  DITTLE
                </span>
              </Link>
            </Section>
            <Section className="card" style={{ backgroundColor: light.card, border: `1px solid ${light.line}`, borderRadius: 6, padding: "32px 32px 28px" }}>
              {children}
            </Section>
            <Section style={{ padding: "18px 4px 0" }}>
              <Text className="faint" style={{ margin: 0, fontSize: 12, lineHeight: "18px", color: light.faint }}>
                {footer}
              </Text>
              <Text className="faint" style={{ margin: "10px 0 0", fontFamily: fonts.mono, fontSize: 11, letterSpacing: "0.04em", color: light.faint }}>
                Dittle · plans in plain notes ·{" "}
                <Link className="faint" href={SITE} style={{ color: light.faint, textDecoration: "underline" }}>
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

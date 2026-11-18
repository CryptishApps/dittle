import type { CSSProperties, ReactNode } from "react";
import { Body, Container, Head, Html, Img, Link, Preview, Section, Text } from "react-email";
import { dark, FONT, FONT_FILE, light, MARK, SITE } from "../brand";

const styles = `
@font-face { font-family: Figtree; font-style: normal; font-weight: 300 900; src: url(${FONT_FILE}) format("woff2"); }
body { margin: 0; background-color: ${light.page}; }
:root { color-scheme: light dark; supported-color-schemes: light dark; }
@media (prefers-color-scheme: dark) {
  body, .page { background-color: ${dark.page} !important; }
  .panel { background-color: ${dark.panel} !important; }
  .card { background-color: ${dark.page} !important; border-color: ${dark.line} !important; }
  .ink { color: ${dark.ink} !important; }
  .soft { color: ${dark.soft} !important; }
  .quiet { color: ${dark.quiet} !important; }
  .line { border-color: ${dark.line} !important; }
  .value { background-color: ${dark.value} !important; color: ${dark.valueInk} !important; }
  .button { background-color: ${dark.ink} !important; color: ${dark.onInk} !important; }
  .link { color: ${dark.link} !important; }
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
      <Body style={{ margin: 0, backgroundColor: light.page, fontFamily: FONT }}>
        <Section className="page" style={{ backgroundColor: light.page, padding: "36px 20px 44px" }}>
          <Container style={{ maxWidth: 520, margin: "0 auto" }}>
            <Section style={{ padding: "0 0 32px" }}>
              <Link href={SITE} style={{ textDecoration: "none" }}>
                <Img className="mark-light" src={MARK.light} width={22} height={22} alt="" style={{ display: "inline-block", verticalAlign: "middle" }} />
                <Img className="mark-dark" src={MARK.dark} width={22} height={22} alt="" style={{ display: "none", verticalAlign: "middle", msoHide: "all" } as CSSProperties} />
                <span className="ink" style={{ display: "inline-block", verticalAlign: "middle", marginLeft: 8, fontSize: 19, fontWeight: 600, letterSpacing: "-0.02em", color: light.ink }}>
                  Dittle
                </span>
              </Link>
            </Section>
            <Section>{children}</Section>
            <Section className="line" style={{ marginTop: 36, paddingTop: 20, borderTop: `1px solid ${light.line}` }}>
              <Text className="quiet" style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: light.quiet }}>
                {footer}
              </Text>
              <Text className="quiet" style={{ margin: "12px 0 0", fontSize: 13, fontWeight: 500, color: light.quiet }}>
                Dittle · Notes that keep track ·{" "}
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

import { Section, Text } from "react-email";
import { fonts, light } from "../brand";
import { Action, Eyebrow, Fallback, Para, Title, Value } from "../parts/blocks";
import { Layout } from "../parts/Layout";

export type NotePreview = { title: string; line: ({ text: string } | { value: string })[] };

export type InviteProps = {
  inviterName: string;
  workspaceName: string;
  inviteeEmail: string;
  url: string;
  expiresOn: string;
  noteCount: number;
  memberCount: number;
  notes: NotePreview[];
};

export const inviteSubject = ({ inviterName, workspaceName }: InviteProps) => `${inviterName} invited you to ${workspaceName} on Dittle`;

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

export default function Invite(props: InviteProps) {
  const { inviterName, workspaceName, inviteeEmail, url, expiresOn, noteCount, memberCount, notes } = props;
  return (
    <Layout
      preview={`Join ${workspaceName} to read and edit its notes.`}
      footer={
        <>
          This invite is for {inviteeEmail} and works until {expiresOn}. If you weren't expecting it, you can ignore this email. Reply to reach {inviterName}.
        </>
      }
    >
      <Eyebrow>Invitation</Eyebrow>
      <Title>
        {inviterName} invited you to plan {workspaceName}
      </Title>
      <Para>You'll be able to read and edit every note in it. Change a number once and every note that uses it follows.</Para>
      <Section className="line" style={{ margin: "6px 0 22px", border: `1px solid ${light.line}`, borderRadius: 4 }}>
        <Section className="line" style={{ padding: "12px 16px", borderBottom: `1px solid ${light.line}` }}>
          <Text className="ink" style={{ margin: 0, fontSize: 15, fontWeight: 600, color: light.ink }}>
            {workspaceName}
          </Text>
          <Text className="faint" style={{ margin: "2px 0 0", fontFamily: fonts.mono, fontSize: 11, letterSpacing: "0.04em", color: light.faint }}>
            {plural(noteCount, "note", "notes")} · {plural(memberCount, "person", "people")}
          </Text>
        </Section>
        {notes.slice(0, 3).map((note, index) => (
          <Section key={note.title} className="line" style={{ padding: "11px 16px", borderTop: index === 0 ? "none" : `1px solid ${light.line}` }}>
            <Text className="ink" style={{ margin: 0, fontSize: 13, fontWeight: 600, color: light.ink }}>
              {note.title}
            </Text>
            <Text className="soft" style={{ margin: "3px 0 0", fontSize: 13, lineHeight: "21px", color: light.soft }}>
              {note.line.map((part, at) => ("value" in part ? <Value key={at}>{part.value}</Value> : <span key={at}>{part.text}</span>))}
            </Text>
          </Section>
        ))}
      </Section>
      <Action href={url}>Join the plan</Action>
      <Fallback href={url} />
    </Layout>
  );
}

Invite.PreviewProps = {
  inviterName: "Sam Rivera",
  workspaceName: "Lisbon long weekend",
  inviteeEmail: "alex@example.com",
  url: "https://dittle.app/invite/7hQ2vX9k",
  expiresOn: "Tuesday 24 November",
  noteCount: 5,
  memberCount: 2,
  notes: [
    { title: "Villa", line: [{ text: "The villa in Alfama is " }, { value: "€1,680" }, { text: " for four nights. There are " }, { value: "6" }, { text: " of us, so " }, { value: "€280" }, { text: " each." }] },
    { title: "Flights", line: [{ value: "6" }, { text: " seats at " }, { value: "£118" }, { text: " each, so " }, { value: "£708" }, { text: " in total." }] },
    { title: "Fado night", line: [{ text: "Clube de Fado with dinner, " }, { value: "€45" }, { text: " each, on " }, { value: "Sat 12 December" }, { text: "." }] },
  ],
} satisfies InviteProps;

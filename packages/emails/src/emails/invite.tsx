import { Section, Text } from "react-email";
import { light } from "../brand";
import { Action, Eyebrow, Fallback, Para, Quote, Title, Value } from "../parts/blocks";
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
  message?: string;
};

export const inviteSubject = ({ inviterName, workspaceName }: InviteProps) => `${inviterName} invited you to ${workspaceName} on Dittle`;

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

function Plan({ name, summary, notes }: { name: string; summary: string; notes: NotePreview[] }) {
  return (
    <Section className="card" style={{ margin: "4px 0 24px", backgroundColor: light.page, border: `1px solid ${light.line}`, borderRadius: 14 }}>
      <Text style={{ margin: 0, padding: "14px 18px 12px", fontSize: 15, fontWeight: 600 }}>
        <span className="ink" style={{ color: light.ink }}>
          {name}
        </span>{" "}
        <span className="quiet" style={{ marginLeft: 4, fontSize: 13, fontWeight: 500, color: light.quiet }}>
          {summary}
        </span>
      </Text>
      {notes.map((note) => (
        <Section key={note.title} className="line" style={{ borderTop: `1px solid ${light.line}`, padding: "12px 18px 14px" }}>
          <Text className="ink" style={{ margin: 0, fontSize: 15, fontWeight: 600, color: light.ink }}>
            {note.title}
          </Text>
          <Text className="soft" style={{ margin: "4px 0 0", fontSize: 14, lineHeight: "26px", color: light.soft }}>
            {note.line.map((part, at) => ("value" in part ? <Value key={at}>{part.value}</Value> : <span key={at}>{part.text}</span>))}
          </Text>
        </Section>
      ))}
    </Section>
  );
}

export default function Invite(props: InviteProps) {
  const { inviterName, workspaceName, inviteeEmail, url, expiresOn, noteCount, memberCount, notes, message } = props;
  return (
    <Layout
      preview={message ?? `Join ${workspaceName} to read and edit its notes.`}
      footer={
        <>
          This invite is for {inviteeEmail} and works until {expiresOn}. If you weren't expecting it, you can ignore this email. Reply to reach {inviterName}.
        </>
      }
    >
      <Eyebrow>Invitation</Eyebrow>
      <Title after={`${plural(noteCount, "note", "notes")}, ${plural(memberCount, "person", "people")} so far.`}>
        {inviterName} invited you to {workspaceName}.
      </Title>
      {message && <Quote from={`${inviterName} wrote`}>{message}</Quote>}
      <Plan name={workspaceName} summary={plural(noteCount, "note", "notes")} notes={notes.slice(0, 3)} />
      <Para>Join to read and edit every note in it. Change a number once, and every note that uses it follows.</Para>
      <Action href={url}>Join the plan</Action>
      <Fallback href={url} />
    </Layout>
  );
}

Invite.PreviewProps = {
  inviterName: "Sam Rivera",
  workspaceName: "Lisbon trip",
  inviteeEmail: "alex@example.com",
  url: "https://dittle.app/invite/7hQ2vX9k",
  expiresOn: "Tuesday 24 November",
  noteCount: 5,
  memberCount: 2,
  message: "Villa's booked! Add yourself to the flights note when you can.",
  notes: [
    { title: "Villa in Alfama", line: [{ text: "The villa is " }, { value: "€1,680" }, { text: " for four nights. There are " }, { value: "6" }, { text: " of us, so " }, { value: "€280" }, { text: " each." }] },
    { title: "Flights", line: [{ value: "6" }, { text: " seats on the Friday flight at " }, { value: "£118" }, { text: " each, so " }, { value: "£708" }, { text: " in total." }] },
    { title: "Fado night", line: [{ text: "Clube de Fado with dinner, " }, { value: "€45" }, { text: " each, on " }, { value: "Sat 12 Dec" }, { text: " at 9pm." }] },
  ],
} satisfies InviteProps;

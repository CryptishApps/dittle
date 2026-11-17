import { Section, Text } from "react-email";
import { light } from "../brand";
import { Action, Eyebrow, Fallback, Key, Para, Sticky, Title } from "../parts/blocks";
import { Layout } from "../parts/Layout";

export type NotePreview = { title: string; line: ({ text: string } | { value: string; calculated?: boolean })[] };

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

function Folder({ name, summary, notes }: { name: string; summary: string; notes: NotePreview[] }) {
  return (
    <Section style={{ margin: "4px 0 24px" }}>
      <Section className="folder" style={{ width: "44%", height: 14, margin: 0, backgroundColor: light.folder, borderRadius: "14px 14px 0 0" }} />
      <Section className="folder" style={{ backgroundColor: light.folder, borderRadius: "0 20px 20px 20px", padding: "14px 14px 6px" }}>
        <Text style={{ margin: "0 4px 12px", fontSize: 17, fontWeight: 650, letterSpacing: "-0.02em" }}>
          <span className="ink" style={{ color: light.ink }}>
            {name}
          </span>{" "}
          <span className="quiet" style={{ marginLeft: 4, fontSize: 13, fontWeight: 500, letterSpacing: 0, color: light.quiet }}>
            {summary}
          </span>
        </Text>
        {notes.map((note) => (
          <Section key={note.title} className="note" style={{ margin: "0 0 8px", backgroundColor: light.sheet, border: `1px solid ${light.line}`, borderRadius: 16, padding: "13px 16px 14px" }}>
            <Text className="ink" style={{ margin: 0, fontSize: 15, fontWeight: 650, color: light.ink }}>
              {note.title}
            </Text>
            <Text className="soft" style={{ margin: "5px 0 0", fontSize: 14, lineHeight: "28px", color: light.soft }}>
              {note.line.map((part, at) =>
                "value" in part ? (
                  <Key key={at} fresh={part.calculated}>
                    {part.value}
                  </Key>
                ) : (
                  <span key={at}>{part.text}</span>
                ),
              )}
            </Text>
          </Section>
        ))}
      </Section>
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
      {message && <Sticky from={`${inviterName} wrote`}>{message}</Sticky>}
      <Folder name={workspaceName} summary={plural(noteCount, "note", "notes")} notes={notes.slice(0, 3)} />
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
    { title: "Villa in Alfama", line: [{ text: "The villa is " }, { value: "€1,680" }, { text: " for four nights. There are " }, { value: "6" }, { text: " of us, so " }, { value: "€280", calculated: true }, { text: " each." }] },
    { title: "Flights", line: [{ value: "6" }, { text: " seats on the Friday flight at " }, { value: "£118" }, { text: " each, so " }, { value: "£708", calculated: true }, { text: " in total." }] },
    { title: "Fado night", line: [{ text: "Clube de Fado with dinner, " }, { value: "€45" }, { text: " each, on " }, { value: "Sat 12 Dec" }, { text: " at 9pm." }] },
  ],
} satisfies InviteProps;

import { Action, Eyebrow, Fallback, Para, Title } from "../parts/blocks";
import { Layout } from "../parts/Layout";

export type MemberJoinedProps = { memberName: string; workspaceName: string; url: string };

export const memberJoinedSubject = ({ memberName, workspaceName }: MemberJoinedProps) => `${memberName} joined ${workspaceName}`;

export default function MemberJoined({ memberName, workspaceName, url }: MemberJoinedProps) {
  return (
    <Layout preview={`${memberName} can now read and edit ${workspaceName}.`} footer={`You're getting this because you invited ${memberName} to ${workspaceName}.`}>
      <Eyebrow>New member</Eyebrow>
      <Title after="They can read and edit every note now.">
        {memberName} joined {workspaceName}.
      </Title>
      <Para>When they change a number, every note that uses it follows, the same as when you do.</Para>
      <Action href={url}>Open the plan</Action>
      <Fallback href={url} />
    </Layout>
  );
}

MemberJoined.PreviewProps = { memberName: "Alex Kim", workspaceName: "Lisbon trip", url: "https://dittle.app/w/lisbon" } satisfies MemberJoinedProps;

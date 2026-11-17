import { Action, Eyebrow, Para, Title } from "../parts/blocks";
import { Layout } from "../parts/Layout";

export type MemberJoinedProps = { memberName: string; workspaceName: string; url: string };

export const memberJoinedSubject = ({ memberName, workspaceName }: MemberJoinedProps) => `${memberName} joined ${workspaceName}`;

export default function MemberJoined({ memberName, workspaceName, url }: MemberJoinedProps) {
  return (
    <Layout preview={`${memberName} can now read and edit ${workspaceName}.`} footer={`You're getting this because you invited ${memberName} to ${workspaceName}.`}>
      <Eyebrow>New member</Eyebrow>
      <Title>
        {memberName} joined {workspaceName}
      </Title>
      <Para>They can now read and edit its notes. When they change a number, every note that uses it follows, the same as when you do.</Para>
      <Action href={url}>Open the plan</Action>
    </Layout>
  );
}

MemberJoined.PreviewProps = { memberName: "Alex Kim", workspaceName: "Lisbon long weekend", url: "https://dittle.app/w/lisbon" } satisfies MemberJoinedProps;

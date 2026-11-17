import { Action, Eyebrow, Fallback, Para, Title } from "../parts/blocks";
import { Layout } from "../parts/Layout";

export type VerifyEmailProps = { name: string; email: string; url: string };

export const verifyEmailSubject = () => "Confirm your email for Dittle";

export default function VerifyEmail({ name, email, url }: VerifyEmailProps) {
  return (
    <Layout preview="Confirm your email so you can get invites and reset your password." footer="You're getting this because someone signed up to Dittle with this address. If it wasn't you, ignore this email and nothing happens.">
      <Eyebrow>Confirm your email</Eyebrow>
      <Title after="One click and you're set.">Confirm your email, {name}.</Title>
      <Para>Confirm {email} so people can invite you to their plans, and so you can reset your password if you ever need to.</Para>
      <Action href={url}>Confirm email</Action>
      <Fallback href={url} />
    </Layout>
  );
}

VerifyEmail.PreviewProps = { name: "Sam", email: "sam@example.com", url: "https://dittle.app/auth/action?mode=verifyEmail&oobCode=Xy7" } satisfies VerifyEmailProps;

import { Action, Eyebrow, Fallback, Para, Title } from "../parts/blocks";
import { Layout } from "../parts/Layout";

export type ResetPasswordProps = { email: string; url: string };

export const resetPasswordSubject = () => "Reset your Dittle password";

export default function ResetPassword({ email, url }: ResetPasswordProps) {
  return (
    <Layout preview="Choose a new password for Dittle." footer="If you didn't ask for this, ignore this email. Your password stays the same.">
      <Eyebrow>Password reset</Eyebrow>
      <Title after="Your notes stay as they are.">Choose a new password.</Title>
      <Para>Someone asked to reset the password for {email}. If that was you, choose a new one below.</Para>
      <Action href={url}>Choose a new password</Action>
      <Fallback href={url} />
    </Layout>
  );
}

ResetPassword.PreviewProps = { email: "sam@example.com", url: "https://dittle.app/auth/action?mode=resetPassword&oobCode=Q4m" } satisfies ResetPasswordProps;

import { createElement, type ReactElement } from "react";
import { render } from "react-email";
import Invite, { inviteSubject, type InviteProps } from "./emails/invite";
import MemberJoined, { memberJoinedSubject, type MemberJoinedProps } from "./emails/member-joined";
import ResetPassword, { resetPasswordSubject, type ResetPasswordProps } from "./emails/reset-password";
import VerifyEmail, { verifyEmailSubject, type VerifyEmailProps } from "./emails/verify-email";

export type { InviteProps, MemberJoinedProps, ResetPasswordProps, VerifyEmailProps };
export type { NotePreview } from "./emails/invite";
export type RenderedEmail = { subject: string; html: string; text: string };

async function rendered(subject: string, element: ReactElement): Promise<RenderedEmail> {
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
  return { subject, html, text };
}

export const inviteEmail = (props: InviteProps) => rendered(inviteSubject(props), createElement(Invite, props));
export const verifyEmail = (props: VerifyEmailProps) => rendered(verifyEmailSubject(), createElement(VerifyEmail, props));
export const resetPasswordEmail = (props: ResetPasswordProps) => rendered(resetPasswordSubject(), createElement(ResetPassword, props));
export const memberJoinedEmail = (props: MemberJoinedProps) => rendered(memberJoinedSubject(props), createElement(MemberJoined, props));

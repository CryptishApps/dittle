import { describe, expect, test } from "bun:test";
import Invite from "./emails/invite";
import MemberJoined from "./emails/member-joined";
import ResetPassword from "./emails/reset-password";
import VerifyEmail from "./emails/verify-email";
import { inviteEmail, memberJoinedEmail, resetPasswordEmail, verifyEmail } from "./index";

describe("emails", () => {
  test("each email has a subject, an HTML body with its link, and a plain-text body with its link", async () => {
    const emails = await Promise.all([
      inviteEmail(Invite.PreviewProps),
      verifyEmail(VerifyEmail.PreviewProps),
      resetPasswordEmail(ResetPassword.PreviewProps),
      memberJoinedEmail(MemberJoined.PreviewProps),
    ]);
    const links = [Invite.PreviewProps.url, VerifyEmail.PreviewProps.url, ResetPassword.PreviewProps.url, MemberJoined.PreviewProps.url];
    emails.forEach((email, index) => {
      expect(email.subject.length).toBeGreaterThan(0);
      expect(email.html).toContain(links[index]!.replaceAll("&", "&amp;"));
      expect(email.text).toContain(links[index]!);
    });
  });

  test("an invite names who sent it, the plan and who it is for", async () => {
    const email = await inviteEmail(Invite.PreviewProps);
    expect(email.subject).toBe("Sam Rivera invited you to Lisbon trip on Dittle");
    expect(email.text).toContain("alex@example.com");
    expect(email.text).toContain("€1,680");
  });
});

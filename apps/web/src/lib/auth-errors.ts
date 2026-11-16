import { FirebaseNotConfigured } from "./firebase-config";

const MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "That email and password don't match.",
  "auth/wrong-password": "That email and password don't match.",
  "auth/user-not-found": "That email and password don't match.",
  "auth/invalid-email": "That doesn't look like an email address.",
  "auth/missing-email": "Enter your email.",
  "auth/missing-password": "Enter your password.",
  "auth/email-already-in-use": "There's already an account with that email. Sign in instead.",
  "auth/credential-already-in-use": "That account is already linked to someone else.",
  "auth/weak-password": "That password is too weak. Check the rules under the box.",
  "auth/password-does-not-meet-requirements": "That password doesn't meet the rules under the box.",
  "auth/too-many-requests": "Too many tries. Wait a minute and try again.",
  "auth/network-request-failed": "You're offline. Check your connection and try again.",
  "auth/popup-blocked": "Your browser blocked the Google window. Allow pop-ups for this site and try again.",
  "auth/operation-not-allowed": "This sign-in method isn't turned on yet.",
  "auth/admin-restricted-operation": "This sign-in method isn't turned on yet.",
  "auth/configuration-not-found": "Sign-in isn't set up for this Firebase project yet.",
  "auth/unauthorized-domain": "This web address isn't allowed to sign in yet.",
};

const CANCELLED = new Set(["auth/popup-closed-by-user", "auth/cancelled-popup-request", "auth/user-cancelled"]);

function codeOf(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" ? error.code : undefined;
}

export function isCancelled(error: unknown): boolean {
  const code = codeOf(error);
  return code !== undefined && CANCELLED.has(code);
}

export function authMessage(error: unknown): string {
  if (error instanceof FirebaseNotConfigured) return "Sign-in isn't connected to Firebase yet.";
  const code = codeOf(error);
  return (code && MESSAGES[code]) || "Something went wrong. Try again.";
}

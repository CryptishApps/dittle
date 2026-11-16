import { FirebaseError } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  GoogleAuthProvider,
  linkWithCredential,
  linkWithPopup,
  onIdTokenChanged,
  signInAnonymously,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { useSyncExternalStore } from "react";
import { firebase } from "./firebase";

export type Session =
  | { kind: "signedOut" }
  | { kind: "guest"; user: User }
  | { kind: "member"; user: User };

export async function readSession(): Promise<Session> {
  const { auth } = firebase();
  await auth.authStateReady();
  return toSession(auth.currentUser);
}

export async function startAsGuest(): Promise<void> {
  await signInAnonymously(firebase().auth);
}

export async function continueWithGoogle(): Promise<void> {
  const { auth } = firebase();
  const provider = new GoogleAuthProvider();
  const current = auth.currentUser;
  if (!current?.isAnonymous) {
    await signInWithPopup(auth, provider);
    return;
  }
  try {
    await linkWithPopup(current, provider);
    await current.getIdToken(true);
  } catch (error) {
    const existing =
      error instanceof FirebaseError && error.code === "auth/credential-already-in-use"
        ? GoogleAuthProvider.credentialFromError(error)
        : null;
    if (!existing) throw error;
    await signInWithCredential(auth, existing);
  }
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(firebase().auth, email, password);
}

export async function signUpWithEmail(name: string, email: string, password: string): Promise<void> {
  const { auth } = firebase();
  const current = auth.currentUser;
  const { user } = current?.isAnonymous
    ? await linkWithCredential(current, EmailAuthProvider.credential(email, password))
    : await createUserWithEmailAndPassword(auth, email, password);
  if (name) await updateProfile(user, { displayName: name });
  await user.getIdToken(true);
}

export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(firebase().auth, email);
}

export function isCancelled(error: unknown): boolean {
  return error instanceof FirebaseError && (error.code === "auth/popup-closed-by-user" || error.code === "auth/cancelled-popup-request");
}

const MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "That email and password don't match.",
  "auth/wrong-password": "That email and password don't match.",
  "auth/user-not-found": "There's no account with that email.",
  "auth/invalid-email": "That doesn't look like an email address.",
  "auth/missing-password": "Enter your password.",
  "auth/email-already-in-use": "There's already an account with that email. Sign in instead.",
  "auth/credential-already-in-use": "That account is already linked to someone else.",
  "auth/weak-password": "Use at least 6 characters for your password.",
  "auth/too-many-requests": "Too many tries. Wait a minute and try again.",
  "auth/network-request-failed": "You're offline. Check your connection and try again.",
  "auth/popup-blocked": "Your browser blocked the Google window. Allow pop-ups for this site and try again.",
  "auth/operation-not-allowed": "This sign-in method isn't turned on yet.",
  "auth/admin-restricted-operation": "This sign-in method isn't turned on yet.",
  "auth/configuration-not-found": "Sign-in isn't set up for this Firebase project yet.",
  "auth/unauthorized-domain": "This web address isn't allowed to sign in yet.",
};

export function authMessage(error: unknown): string {
  if (error instanceof FirebaseError && error.code in MESSAGES) return MESSAGES[error.code]!;
  return "Something went wrong. Try again.";
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(firebase().auth);
}

export function useSession(): Session {
  return useSyncExternalStore(subscribe, getSnapshot);
}

let snapshot: Session | undefined;

function subscribe(onChange: () => void): () => void {
  return onIdTokenChanged(firebase().auth, (user) => {
    snapshot = toSession(user);
    onChange();
  });
}

function getSnapshot(): Session {
  snapshot ??= toSession(firebase().auth.currentUser);
  return snapshot;
}

function toSession(user: User | null): Session {
  if (!user) return { kind: "signedOut" };
  return user.isAnonymous ? { kind: "guest", user } : { kind: "member", user };
}

import { FirebaseError } from "firebase/app";
import {
  GoogleAuthProvider,
  linkWithPopup,
  onIdTokenChanged,
  signInAnonymously,
  signInWithCredential,
  signInWithPopup,
  signOut as firebaseSignOut,
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

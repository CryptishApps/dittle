import { FirebaseError } from "firebase/app";
import {
  browserPopupRedirectResolver,
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  GoogleAuthProvider,
  linkWithCredential,
  linkWithPopup,
  onIdTokenChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  validatePassword,
  type User,
} from "firebase/auth";
import { auth } from "./firebase";
import { publishSession, type Session } from "./session";

onIdTokenChanged(auth, (user) => publishSession(toSession(user)));

export async function ready(): Promise<Session> {
  await auth.authStateReady();
  const session = toSession(auth.currentUser);
  publishSession(session);
  return session;
}

export async function startAsGuest(): Promise<void> {
  await signInAnonymously(auth);
}

export async function continueWithGoogle(): Promise<void> {
  const provider = new GoogleAuthProvider();
  const current = auth.currentUser;
  if (!current?.isAnonymous) {
    await signInWithPopup(auth, provider, browserPopupRedirectResolver);
    return;
  }
  try {
    await linkWithPopup(current, provider, browserPopupRedirectResolver);
    await current.getIdToken(true);
  } catch (error) {
    const existing =
      error instanceof FirebaseError && error.code === "auth/credential-already-in-use" ? GoogleAuthProvider.credentialFromError(error) : null;
    if (!existing) throw error;
    await signInWithCredential(auth, existing);
  }
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email, password);
}

export async function signUpWithEmail(name: string, email: string, password: string): Promise<void> {
  const current = auth.currentUser;
  const { user } = current?.isAnonymous
    ? await linkWithCredential(current, EmailAuthProvider.credential(email, password))
    : await createUserWithEmailAndPassword(auth, email, password);
  if (name) await updateProfile(user, { displayName: name });
  await user.getIdToken(true);
  publishSession(toSession(user));
  void sendEmailVerification(user).catch(() => undefined);
}

export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

export type PasswordRule = { label: string; met: boolean };
export type PasswordCheck = { valid: boolean; rules: PasswordRule[] };

export async function checkPassword(password: string): Promise<PasswordCheck> {
  const status = await validatePassword(auth, password);
  const options = status.passwordPolicy.customStrengthOptions;
  const rules: PasswordRule[] = [];
  const add = (label: string, met: boolean | undefined) => met !== undefined && rules.push({ label, met });
  add(`${options.minPasswordLength ?? 6}+ characters`, status.meetsMinPasswordLength);
  add("Lowercase", status.containsLowercaseLetter);
  add("Uppercase", status.containsUppercaseLetter);
  add("Number", status.containsNumericCharacter);
  add("Symbol", status.containsNonAlphanumericCharacter);
  add(`At most ${options.maxPasswordLength} characters`, status.meetsMaxPasswordLength);
  return { valid: status.isValid, rules };
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

function toSession(user: User | null): Session {
  if (!user) return { kind: "signedOut" };
  return user.isAnonymous ? { kind: "guest", user } : { kind: "member", user };
}

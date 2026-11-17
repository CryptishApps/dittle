import { FirebaseError } from "firebase/app";
import {
  applyActionCode,
  AuthErrorCodes,
  browserPopupRedirectResolver,
  checkActionCode,
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  GoogleAuthProvider,
  onIdTokenChanged,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  validatePassword,
  verifyPasswordResetCode,
  type User,
} from "firebase/auth";
import { auth } from "./firebase";
import { confirmMethod, publishSession, type Session } from "./session";

onIdTokenChanged(auth, (user) => publishSession(toSession(user)));

export async function ready(): Promise<Session> {
  await auth.authStateReady();
  const session = toSession(auth.currentUser);
  publishSession(session);
  return session;
}

export async function continueWithGoogle(): Promise<void> {
  await signInWithPopup(auth, new GoogleAuthProvider(), browserPopupRedirectResolver);
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email, password);
}

export async function signUpWithEmail(name: string, email: string, password: string): Promise<void> {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  if (name) {
    await updateProfile(user, { displayName: name });
    publishSession(toSession(user));
  }
  void sendEmailVerification(user, { url: `${location.origin}/notes` }).catch(() => undefined);
}

export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email, { url: `${location.origin}/signin` });
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
  if (status.meetsMaxPasswordLength === false) add(`At most ${options.maxPasswordLength} characters`, false);
  return { valid: status.isValid, rules };
}

export async function emailForPasswordReset(code: string): Promise<string> {
  return verifyPasswordResetCode(auth, code);
}

export async function resetPassword(code: string, email: string, password: string): Promise<void> {
  await confirmPasswordReset(auth, code, password);
  await signInWithEmailAndPassword(auth, email, password);
}

export async function verifyEmail(code: string): Promise<void> {
  await applyActionCode(auth, code);
  await auth.currentUser?.reload();
}

export async function recoverEmail(code: string): Promise<string | undefined> {
  const info = await checkActionCode(auth, code);
  await applyActionCode(auth, code);
  return info.data.email ?? undefined;
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

export async function confirmIdentity(user: User, password: string): Promise<void> {
  if (confirmMethod(user) === "password") await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email ?? "", password));
  else await reauthenticateWithPopup(user, new GoogleAuthProvider(), browserPopupRedirectResolver);
}

export async function deleteSignedInUser(user: User): Promise<"deleted" | "confirm-identity"> {
  try {
    await deleteUser(user);
    return "deleted";
  } catch (error) {
    if (error instanceof FirebaseError && error.code === AuthErrorCodes.CREDENTIAL_TOO_OLD_LOGIN_AGAIN) return "confirm-identity";
    throw error;
  }
}

function toSession(user: User | null): Session {
  return user ? { kind: "signedIn", user } : { kind: "signedOut" };
}

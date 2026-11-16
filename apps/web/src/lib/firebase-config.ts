import type { FirebaseOptions } from "firebase/app";

export class FirebaseNotConfigured extends Error {
  constructor(readonly missing: string[]) {
    super(`Firebase isn't configured. Add ${missing.join(", ")} to apps/web/.env.local (see .env.example).`);
    this.name = "FirebaseNotConfigured";
  }
}

export function firebaseOptions(): FirebaseOptions {
  const env = import.meta.env;
  const settings = {
    VITE_FIREBASE_API_KEY: env.VITE_FIREBASE_API_KEY,
    VITE_FIREBASE_AUTH_DOMAIN: env.VITE_FIREBASE_AUTH_DOMAIN,
    VITE_FIREBASE_PROJECT_ID: env.VITE_FIREBASE_PROJECT_ID,
    VITE_FIREBASE_APP_ID: env.VITE_FIREBASE_APP_ID,
  };
  const missing = Object.entries(settings)
    .filter(([, value]) => !value)
    .map(([name]) => name);
  if (missing.length > 0) throw new FirebaseNotConfigured(missing);
  return {
    apiKey: settings.VITE_FIREBASE_API_KEY,
    authDomain: settings.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: settings.VITE_FIREBASE_PROJECT_ID,
    appId: settings.VITE_FIREBASE_APP_ID,
  };
}

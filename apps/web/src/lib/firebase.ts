import { initializeApp, type FirebaseApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { getAuth, type Auth } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";

export type Firebase = { app: FirebaseApp; auth: Auth; db: Firestore };

let connection: Firebase | undefined;

export function firebase(): Firebase {
  connection ??= connect();
  return connection;
}

function connect(): Firebase {
  const env = import.meta.env;
  const settings = {
    VITE_FIREBASE_API_KEY: env.VITE_FIREBASE_API_KEY,
    VITE_FIREBASE_AUTH_DOMAIN: env.VITE_FIREBASE_AUTH_DOMAIN,
    VITE_FIREBASE_PROJECT_ID: env.VITE_FIREBASE_PROJECT_ID,
    VITE_FIREBASE_APP_ID: env.VITE_FIREBASE_APP_ID,
    VITE_RECAPTCHA_ENTERPRISE_SITE_KEY: env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY,
  };
  const missing = Object.entries(settings)
    .filter(([, value]) => !value)
    .map(([name]) => name);
  if (missing.length > 0) {
    throw new FirebaseNotConfigured(missing);
  }

  const app = initializeApp({
    apiKey: settings.VITE_FIREBASE_API_KEY,
    authDomain: settings.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: settings.VITE_FIREBASE_PROJECT_ID,
    appId: settings.VITE_FIREBASE_APP_ID,
  });

  if (env.DEV) {
    globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN = env.VITE_APPCHECK_DEBUG_TOKEN || true;
  }
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(settings.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY!),
    isTokenAutoRefreshEnabled: true,
  });

  const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });

  return { app, auth: getAuth(app), db };
}

export class FirebaseNotConfigured extends Error {
  constructor(readonly missing: string[]) {
    super(`Firebase isn't configured. Add ${missing.join(", ")} to apps/web/.env.local (see .env.example).`);
    this.name = "FirebaseNotConfigured";
  }
}

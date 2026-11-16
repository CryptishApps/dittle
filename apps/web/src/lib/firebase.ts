import { initializeApp } from "firebase/app";
import { browserLocalPersistence, indexedDBLocalPersistence, initializeAuth } from "firebase/auth";
import { firebaseOptions } from "./firebase-config";

export const app = initializeApp(firebaseOptions());

const siteKey = import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY;
if (siteKey) {
  const { initializeAppCheck, ReCaptchaEnterpriseProvider } = await import("firebase/app-check");
  if (import.meta.env.DEV) globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN = import.meta.env.VITE_APPCHECK_DEBUG_TOKEN || true;
  initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(siteKey), isTokenAutoRefreshEnabled: true });
}

export const auth = initializeAuth(app, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence],
});

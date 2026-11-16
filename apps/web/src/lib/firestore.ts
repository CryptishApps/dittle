import {
  enablePersistentCacheIndexAutoCreation,
  getPersistentCacheIndexManager,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { ensureAppCheck } from "./app-check";
import { app } from "./firebase";

await ensureAppCheck();

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  ignoreUndefinedProperties: true,
});

const indexes = getPersistentCacheIndexManager(db);
if (indexes) enablePersistentCacheIndexAutoCreation(indexes);

void navigator.storage?.persist?.();

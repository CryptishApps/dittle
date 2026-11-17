import { getAI, GoogleAIBackend } from "firebase/ai";
import { ensureInitialized, fetchAndActivate, getRemoteConfig, getValue } from "firebase/remote-config";
import { ensureAppCheck } from "./app-check";
import { app } from "./firebase";

const MODEL_CONFIG_KEY = "cloud_model";
const DEFAULT_CLOUD_MODEL = "gemini-3.5-flash-lite";
const CONFIG_REFRESH_MS = 60 * 60 * 1000;

const remoteConfig = getRemoteConfig(app);
remoteConfig.settings.minimumFetchIntervalMillis = CONFIG_REFRESH_MS;
remoteConfig.defaultConfig = { [MODEL_CONFIG_KEY]: DEFAULT_CLOUD_MODEL };

await Promise.all([ensureAppCheck(), ensureInitialized(remoteConfig).catch(() => undefined)]);
void fetchAndActivate(remoteConfig).catch(() => undefined);

export const ai = getAI(app, { backend: new GoogleAIBackend() });

export const CLOUD_MODEL = getValue(remoteConfig, MODEL_CONFIG_KEY).asString();

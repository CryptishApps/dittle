import { getAI, GoogleAIBackend } from "firebase/ai";
import { ensureAppCheck } from "./app-check";
import { app } from "./firebase";

await ensureAppCheck();

export const ai = getAI(app, { backend: new GoogleAIBackend() });

export const CLOUD_MODEL = "gemini-3.5-flash-lite";

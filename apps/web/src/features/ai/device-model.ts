import { useSyncExternalStore } from "react";

export type DeviceModelStatus = "checking" | "no-api" | "unavailable" | "downloadable" | "downloading" | "available";
export type DeviceModelState = { status: DeviceModelStatus; progress?: number; error?: string };

type PromptApi = { availability: (options: object) => Promise<string> };

const TEXT_EN = [{ type: "text", languages: ["en"] }];
const KNOWN: DeviceModelStatus[] = ["unavailable", "downloadable", "downloading", "available"];

let state: DeviceModelState = { status: "checking" };
let checked = false;
const listeners = new Set<() => void>();

function set(next: DeviceModelState) {
  state = next;
  listeners.forEach((listener) => listener());
}

export async function checkDeviceModel(): Promise<void> {
  const api = (globalThis as { LanguageModel?: PromptApi }).LanguageModel;
  if (!api) return set({ status: "no-api" });
  try {
    const answer = await api.availability({ expectedInputs: TEXT_EN, expectedOutputs: TEXT_EN });
    if (state.progress !== undefined && answer === "downloading") return;
    set({ status: KNOWN.find((status) => status === answer) ?? "unavailable" });
  } catch {
    set({ status: "unavailable" });
  }
}

export function useDeviceModel(): DeviceModelState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      if (!checked) {
        checked = true;
        void checkDeviceModel();
        document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && void checkDeviceModel());
      }
      return () => listeners.delete(listener);
    },
    () => state,
  );
}

export const loadDeviceModel = () => import("./name-value").then((module) => module.deviceModel);

export async function downloadDeviceModel(): Promise<void> {
  set({ status: "downloading", progress: 0 });
  try {
    const model = await loadDeviceModel();
    await model.initializeDeviceModel((progress) => set({ status: "downloading", progress }));
    set({ status: "available" });
    await checkDeviceModel();
  } catch (error) {
    set({ status: "downloadable", error: error instanceof Error ? error.message : String(error) });
  }
}

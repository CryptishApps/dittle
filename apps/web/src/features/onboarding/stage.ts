import { useSyncExternalStore } from "react";

type Stage = "skipped" | "done";

const keyOf = (uid: string) => `dittle.onboarding.${uid}`;
const running = new Set<string>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

function readStage(uid: string): Stage | undefined {
  try {
    const stored = localStorage.getItem(keyOf(uid));
    return stored === "skipped" || stored === "done" ? stored : undefined;
  } catch {
    return undefined;
  }
}

function writeStage(uid: string, stage: Stage | undefined): void {
  try {
    if (stage) localStorage.setItem(keyOf(uid), stage);
    else localStorage.removeItem(keyOf(uid));
  } catch {
    return;
  }
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export type OnboardingView = "flow" | "start" | "home";

export function onboardingView(stage: Stage | undefined, isRunning: boolean, empty: boolean): OnboardingView {
  if (isRunning) return "flow";
  if (!empty || stage === "done") return "home";
  return stage === "skipped" ? "start" : "flow";
}

export function useOnboardingView(uid: string, empty: boolean): OnboardingView {
  const snapshot = useSyncExternalStore(subscribe, () => `${running.has(uid) ? 1 : 0}${readStage(uid) ?? ""}`);
  return onboardingView(readStage(uid), snapshot.startsWith("1"), empty);
}

export const onboarding = {
  begin: (uid: string) => {
    if (running.has(uid)) return;
    running.add(uid);
    emit();
  },
  end: (uid: string, stage: Stage) => {
    running.delete(uid);
    writeStage(uid, stage);
    emit();
  },
  restart: (uid: string) => {
    writeStage(uid, undefined);
    running.add(uid);
    emit();
  },
};

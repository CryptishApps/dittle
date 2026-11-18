import { InferenceMode } from "firebase/ai";
import { readRoute, readTidy, ROUTE_INSTRUCTIONS, ROUTE_SCHEMA, routePrompt, TIDY_INSTRUCTIONS, TIDY_SCHEMA, tidyPrompt, type CaptureRoute, type CaptureShown, type NoteDraft } from "./capture-answer";
import { datesLine } from "./describe";
import { createHybrid, type InferenceWhere } from "./hybrid";

export { CAPTURE_PROMPT_VERSION } from "./prompt-versions";
export type { CaptureRoute, CaptureShown, DraftParagraph, DraftValue, NoteDraft, ShownCollection, ShownValue } from "./capture-answer";

type Timed = { where: InferenceWhere; ms: number };

const router = createHybrid("Route a capture", InferenceMode.ONLY_IN_CLOUD, ROUTE_INSTRUCTIONS, ROUTE_SCHEMA);
const tidier = createHybrid("Tidy a paste", InferenceMode.ONLY_IN_CLOUD, TIDY_INSTRUCTIONS, TIDY_SCHEMA);

export async function routeCapture(entry: string, shown: CaptureShown, today = new Date()): Promise<{ route: CaptureRoute } & Timed> {
  const { text, where, ms } = await router.ask(routePrompt(entry, datesLine(today), shown));
  return { route: readRoute(text, shown), where, ms };
}

export async function tidyPaste(paste: string, today = new Date()): Promise<{ draft: NoteDraft } & Timed> {
  const { text, where, ms } = await tidier.ask(tidyPrompt(paste, datesLine(today)));
  return { draft: readTidy(text), where, ms };
}

import { InferenceMode } from "firebase/ai";
import { createHybrid, type InferenceWhere } from "./hybrid";
import { MAX_OPTIONS, OPERATIONS, OPTION_KEYS, readWhatIfAnswer, whatIfPrompt, type WhatIfAnswer, type WhatIfOption } from "./what-if-answer";

export const WHAT_IF_PROMPT_VERSION = "v1";

export type { Operation, WhatIfOption } from "./what-if-answer";
export type WhatIfResult = { answer: WhatIfAnswer; where: InferenceWhere; ms: number };

const INSTRUCTIONS = `Someone plans in notes, and an app tracks the numbers in them, such as a group size, a price or a budget. They ask a what-if question. Pick the one tracked value the question changes, and how it changes.

- "value": the tracked value the question changes, from the numbered list. Answer none when the question is not about a change to one of the listed values, or when you are not sure which one.
- "operation": set when the question gives the new number, add or subtract when it gives a change up or down, multiply when it scales the value, such as double (2), half (0.5) or 10% more (1.1).
- "number": that number, in digits, without currency signs or units. "Two more" is 2.

Values that are calculated from others, such as totals and shares, are not listed. The app works them out itself.

Example
Values:
v1: 80 · count · guest count · about wedding · in "Catering", "Venue"
v2: £38 · money · price per head · about Rosa's Kitchen · in "Catering"
v3: £2,500 · money · venue hire · about Hartley Barn · in "Venue"
Question: What if 15 more people come?
Answer: {"value":"v1","operation":"add","number":15}

Example
Values:
v1: 80 · count · guest count · about wedding · in "Catering", "Venue"
v2: £38 · money · price per head · about Rosa's Kitchen · in "Catering"
Question: what if Rosa's put the price up to £45
Answer: {"value":"v2","operation":"set","number":45}

Example
Values:
v1: 80 · count · guest count · about wedding · in "Catering", "Venue"
v2: £38 · money · price per head · about Rosa's Kitchen · in "Catering"
Question: What if the band cancels?
Answer: {"value":"none","operation":"set","number":0}`;

const SCHEMA = {
  type: "object",
  properties: {
    value: { type: "string", enum: [...OPTION_KEYS, "none"] },
    operation: { type: "string", enum: [...OPERATIONS] },
    number: { type: "number" },
  },
  required: ["value", "operation", "number"],
};

export function createWhatIf(mode: InferenceMode) {
  const asker = createHybrid("Answer a what-if", mode, INSTRUCTIONS, SCHEMA);
  return async ({ question, options }: { question: string; options: WhatIfOption[] }): Promise<WhatIfResult> => {
    const shown = options.slice(0, MAX_OPTIONS);
    const { text, where, ms } = await asker.ask(whatIfPrompt(question, shown));
    return { answer: readWhatIfAnswer(text, shown), where, ms };
  };
}

export const askWhatIf = createWhatIf(InferenceMode.PREFER_IN_CLOUD);

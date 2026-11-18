import { getGenerativeModel, type GenerativeModel, type Part } from "firebase/ai";
import { ai, CLOUD_MODEL } from "@/lib/ai";
import { baseMimeType, fitWithin, readMediaAnswer } from "./media-answer";
import { recordCall } from "./usage";

export const MAX_RECORDING_MS = 60_000;
const MAX_IMAGE_SIDE = 1600;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const CALL_TIMEOUT_MS = 45_000;

const SCHEMA = { type: "object", properties: { text: { type: "string" } }, required: ["text"] };

const TRANSCRIBE_INSTRUCTIONS = `You hear a short voice memo someone recorded to start a note. Write down what they said as clean note text.

- Keep their words and meaning. Do not add facts, greetings or commentary.
- Drop filler such as "um", "uh" and false starts.
- Start with a capital letter and use normal punctuation.
- Write numbers, money, dates, times, durations and measurements in digits with standard units and symbols: "five k" is "5 km", "twenty seven forty" for a run time is "27:40", "a hundred and eighteen pounds" is "£118", "half past nine" is "9:30".
- If nothing is said, return an empty "text".

Example
Heard: ran five k this morning um twenty seven forty
Answer: {"text":"Ran 5 km this morning in 27:40"}`;

const IMAGE_INSTRUCTIONS = `You get one image someone dropped into their notes app, usually a screenshot of a booking, a receipt, a ticket, an order or a result. Write the useful content as short plain note text they would have typed themselves.

- One short line of at most 25 words. Lead with what it is, then only the details someone would look up later: dates, times, places, amounts, references. Leave out details that repeat or can be worked out from others.
- Copy numbers, prices, dates, times and reference codes exactly as shown, with currency symbols and units.
- Skip ads, navigation, legal text, logos and anything decorative.
- No headings, labels, bullet points, markdown or commentary.
- If the image has nothing worth noting, return an empty "text".

Example
Image: an airline confirmation for two passengers to Lisbon arriving Friday 11 December 09:40, £118 per person, booking reference X7K2
Answer: {"text":"Flights to Lisbon land Fri 11 Dec at 9:40, £118 each, booking ref X7K2"}`;

let models: { audio: GenerativeModel; image: GenerativeModel } | undefined;

function model(kind: "audio" | "image"): GenerativeModel {
  const generationConfig = { responseMimeType: "application/json", responseJsonSchema: SCHEMA, temperature: 0 };
  models ??= {
    audio: getGenerativeModel(ai, { model: CLOUD_MODEL, systemInstruction: TRANSCRIBE_INSTRUCTIONS, generationConfig }),
    image: getGenerativeModel(ai, { model: CLOUD_MODEL, systemInstruction: IMAGE_INSTRUCTIONS, generationConfig }),
  };
  return models[kind];
}

async function ask(task: string, kind: "audio" | "image", media: Blob, prompt: string): Promise<string> {
  const started = performance.now();
  const parts: Part[] = [
    { type: "inlineData", inlineData: { mimeType: baseMimeType(media.type), data: await toBase64(media) } },
    { type: "text", text: prompt },
  ];
  let timer: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = window.setTimeout(() => reject(new Error(`${task} took longer than ${CALL_TIMEOUT_MS / 1000} s`)), CALL_TIMEOUT_MS);
  });
  const result = await Promise.race([model(kind).generateContent(parts), timeout]).finally(() => window.clearTimeout(timer));
  recordCall({ task, where: "in_cloud", ms: Math.round(performance.now() - started), at: Date.now() });
  return readMediaAnswer(result.response.text());
}

export async function transcribeAudio(audio: Blob): Promise<string> {
  if (audio.size === 0) return "";
  return ask("Transcribe voice", "audio", audio, "Write down this voice memo.");
}

export async function readImage(image: Blob): Promise<string> {
  return ask("Read image", "image", await shrinkImage(image), "Write the useful content of this image as a note.");
}

async function shrinkImage(image: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(image);
  try {
    const size = fitWithin(bitmap.width, bitmap.height, MAX_IMAGE_SIDE);
    if (size.width === bitmap.width && image.size <= MAX_IMAGE_BYTES && image.type !== "") return image;
    const canvas = new OffscreenCanvas(size.width, size.height);
    const context = canvas.getContext("2d");
    if (!context) return image;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, size.width, size.height);
    context.drawImage(bitmap, 0, 0, size.width, size.height);
    return await canvas.convertToBlob({ type: "image/jpeg", quality: 0.85 });
  } finally {
    bitmap.close();
  }
}

async function toBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let start = 0; start < bytes.length; start += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(start, start + 0x8000));
  }
  return btoa(binary);
}

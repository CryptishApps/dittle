export type ChatLine = { who: string; said: string };
export type Sample = { id: string; label: string; chat?: ChatLine[]; text?: string };

export const SAMPLES: Sample[] = [
  {
    id: "chat",
    label: "a group chat",
    chat: [
      { who: "Priya", said: "cottage in St Ives is booked!! £920 for the 3 nights" },
      { who: "Sam", said: "amazing. train is £84 return each, leaves Paddington 8:06 on fri 4 dec" },
      { who: "Jo", said: "so who's in? me, Priya, Sam, Leo = 4?" },
      { who: "Leo", said: "can't do it sorry 😩 work thing" },
      { who: "Priya", said: "ok 3 of us then. surf lesson sat morning, £45 each, I'll book it" },
    ],
  },
  {
    id: "receipt",
    label: "a receipt",
    text: [
      "THE GREEN FORK",
      "12 Market Street",
      "18/11/2026  19:42   Table 7",
      "2 x Margherita        £23.00",
      "1 x Burrata            £9.50",
      "3 x Peroni            £16.50",
      "Subtotal              £49.00",
      "Service 12.5%          £6.13",
      "TOTAL                 £55.13",
      "Split 3 ways",
    ].join("\n"),
  },
  {
    id: "race",
    label: "a race result",
    text: [
      "Richmond Park 10K - Official result",
      "Sunday 15 November 2026",
      "Bib 1482",
      "Chip time 52:41",
      "Gun time 53:10",
      "Position 412 of 1,876",
      "Category F35-39: 38th",
      "Average pace 5:16/km",
    ].join("\n"),
  },
];

export const sampleText = (sample: Sample) => sample.text ?? (sample.chat ?? []).map((line) => `${line.who}: ${line.said}`).join("\n");

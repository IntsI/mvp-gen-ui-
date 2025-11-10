// app/api/spec/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { mediaCatalog } from "@/lib/media-catalog";
import type { UiSpec } from "@/schemas/ui-spec";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Expose catalog to the model in a readable way
const MEDIA_LIBRARY = Object.entries(mediaCatalog).map(([id, url]) => ({
  id,
  description: id
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase()),
  exampleUrl: url,
}));

const ALL_MEDIA_IDS = Object.keys(mediaCatalog);

export async function POST(req: NextRequest) {
  try {
    const { intent } = await req.json();
    const intentText = JSON.stringify(intent || {});

    const systemPrompt = `
You generate a UiSpec JSON for a 2x2 grid of promotional cards.

Return ONLY valid JSON. No markdown, no comments, no explanations.

### UiSpec schema

{
  "layout": "four-cards-cta",
  "style": {},
  "components": [
    {
      "kind": "Stage",
      "children": [CardNode, CardNode, CardNode, CardNode]
    }
  ]
}

CardNode schema:

{
  "kind": "Card",
  "slots": [
    { "slot": "title", "text": string },
    { "slot": "body", "text": string },
    { "slot": "cta", "label": string },
    {
      "slot": "media",
      "kind": "image",
      "id": string
    }
  ]
}

### Image library

These are the only valid "media.id" values:

${JSON.stringify(MEDIA_LIBRARY, null, 2)}

Interpretation guidelines (very important):

- Infer product/category from the id:
  - ids containing "tab"  -> Galaxy Tab / tablet visuals
  - ids containing "fold" or "flip" or "combo" -> foldable phones
  - ids containing "watch" -> Galaxy Watch / wearables
  - ids containing "s24" -> Galaxy S24 phones
  - others: infer from their wording
- When the campaign intent is focused on ONE category:
  - ONLY use ids that match that category.
  - Example: if the brief is only about Galaxy Tab,
    do NOT use "fold", "flip", "watch", "s24" images.
- When the intent clearly mentions MULTIPLE categories (ecosystem):
  - you MAY mix relevant ids from those categories.
- Always choose ids that are semantically consistent with:
  - product(s) mentioned in BUSINESS INTENT and USER INTENT
  - tone and story of the copy you generate.

### Card content rules

For each of the 4 cards:

- "title": short, strong, campaign-appropriate.
- "body": 1–3 concise sentences; reflect the specific angle of that card.
- "cta": clear action (e.g. "Pre-order Now", "See Bonuses", "Explore Features").
- "media":
  - { "slot": "media", "kind": "image", "id": <one of the allowed ids> }

Global:

- EXACTLY 4 cards in Stage.children.
- All copy MUST be derived from the provided intent:
  - reflect user intent & business intent,
  - respect DOs and DON'Ts,
  - keep tone premium and aspirational.
- Make the 4 cards distinct (hero, benefits, lifestyle, bonuses, etc.).
- Do NOT output any fields outside the described schema.
    `.trim();

    const messages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: intentText },
    ];

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.95,
      response_format: { type: "json_object" },
      messages,
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    const spec = JSON.parse(raw) as UiSpec;

    // ---- structural validation only ----

    if (spec.layout !== "four-cards-cta") {
      throw new Error("layout must be 'four-cards-cta'");
    }

    if (!Array.isArray(spec.components) || spec.components.length === 0) {
      throw new Error("Missing components");
    }

    const stage: any = spec.components[0];
    if (!stage || stage.kind !== "Stage" || !Array.isArray(stage.children)) {
      throw new Error("First component must be a Stage with children");
    }
    if (stage.children.length !== 4) {
      throw new Error("Stage must contain exactly 4 cards");
    }

    for (const [i, card] of stage.children.entries()) {
      if (card.kind !== "Card" || !Array.isArray(card.slots)) {
        throw new Error(`Card #${i} is malformed`);
      }

      const title = card.slots.find((s: any) => s.slot === "title");
      const body = card.slots.find((s: any) => s.slot === "body");
      const cta = card.slots.find((s: any) => s.slot === "cta");
      const media = card.slots.find((s: any) => s.slot === "media");

      if (!title?.text || !body?.text || !cta?.label || !media) {
        throw new Error(
          `Card #${i} must include title, body, cta, and media slots`
        );
      }

      if (media.kind !== "image") {
        throw new Error(`Card #${i} media.kind must be "image"`);
      }

      if (!ALL_MEDIA_IDS.includes(media.id)) {
        throw new Error(
          `Card #${i} media.id "${media.id}" is not in mediaCatalog`
        );
      }
    }

    // No corrections: image choices are exactly what the model decided.
    return NextResponse.json(spec);
  } catch (err: any) {
    console.error("❌ /api/spec error", err);
    return NextResponse.json(
      {
        error: "Failed to generate spec",
        detail: String(err?.message ?? err),
      },
      { status: 500 }
    );
  }
}
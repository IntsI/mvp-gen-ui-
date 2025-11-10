// app/api/spec/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { mediaCatalog } from "@/lib/media-catalog";
import type { UiSpec } from "@/schemas/ui-spec";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? process.env.OPEN_AI_KEY ?? "",
});

if (!client.apiKey) {
  throw new Error(
    "Missing OpenAI API key. Set OPENAI_API_KEY or OPEN_AI_KEY in environment."
  );
}

// Make catalog visible to the model
const MEDIA_LIBRARY = Object.entries(mediaCatalog).map(([id, url]) => ({
  id,
  description: id
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase()),
  exampleUrl: url,
}));

const ALL_MEDIA_IDS = Object.keys(mediaCatalog);

/* ---------- generic helpers ---------- */

function tokenize(str: string): string[] {
  return str
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((t) => t.replace(/[0-9]+/g, "")) // watch8 -> watch
    .filter((t) => t.length >= 3);
}

/**
 * Generic semantic relevance:
 * overlap between cleaned id tokens and intent tokens.
 * 0 = no match; higher = better.
 */
function scoreMediaIdForIntent(id: string, intent: any): number {
  const intentTokens = new Set(tokenize(JSON.stringify(intent || {})));
  const idTokens = tokenize(id);

  if (!idTokens.length || !intentTokens.size) return 0;

  let score = 0;
  for (const t of idTokens) {
    if (intentTokens.has(t)) score += 1;
  }
  return score;
}

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

CardNode:

{
  "kind": "Card",
  "slots": [
    { "slot": "title", "text": string },
    { "slot": "body", "text": string },
    { "slot": "cta", "label": string },
    {
      "slot": "media",
      "kind": "image" | "placeholder",
      "id"?: string
    }
  ]
}

### Image library

You may use ONLY these ids for "media.id":

${JSON.stringify(MEDIA_LIBRARY, null, 2)}

### Media selection rules (IMPORTANT)

- First, infer the campaign's main product/category from the intent:
  brand, series, device type, etc.
- If one or more library ids clearly match that product/category:
  - Use them with "kind": "image".
  - You may reuse ids or mix several relevant ones.
- If NONE of the library ids clearly match the campaign
  (e.g. library is Samsung-only but intent is about iPhone):
  - Use "kind": "placeholder" and omit "id" for those cards instead of forcing a wrong brand.
- Never intentionally misrepresent a different brand or product line.

### Card content rules

- Exactly 4 cards.
- Each card:
  - "title": short, strong.
  - "body": 1–3 concise sentences aligned to that card's angle.
  - "cta": clear action.
  - "media": as defined above.
- Copy MUST be derived from the given intent:
  respect user intent, business intent, DOs and DON'Ts.
  Tone: premium, aspirational, brand-safe.
- Cards should be distinct (hero, benefits, lifestyle, bonuses, etc.).
- No extra fields beyond this schema.
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

    /* ---------- structural validation ---------- */

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

    /* ---------- slot + media post-processing ---------- */

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

      // Ensure cta.action is optional
      if (cta.action && typeof cta.action !== "string") {
        delete cta.action;
      }

      // Normalize media semantics **without** product-specific rules:
      if (media.kind === "image") {
        if (typeof media.id !== "string" || !ALL_MEDIA_IDS.includes(media.id)) {
          // invalid id -> degrade to placeholder
          media.kind = "placeholder";
          delete media.id;
        } else {
          const relevance = scoreMediaIdForIntent(media.id, intent);
          if (relevance <= 0) {
            // image has no semantic overlap with intent -> use placeholder instead
            media.kind = "placeholder";
            delete media.id;
          }
        }
      } else {
        // placeholder is always allowed; make sure id is not misleading
        delete media.id;
      }
    }

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
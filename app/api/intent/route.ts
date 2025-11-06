export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

// Lazy init so env is read at runtime (not during build)
function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    console.warn("⚠️ Missing OPENAI_API_KEY at runtime");
    throw new Error("Missing OPENAI_API_KEY");
  }
  console.log("🔑 OPENAI key present:", true);
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// Helper to coerce array -> single string
function asText(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.filter(x => typeof x === "string").join(" ").trim() || undefined;
  return String(v);
}

// Intent schema (CTA required so LLM always decides)
const Intent = z.object({
  goal: z.string().max(200),
  tone: z.enum(["neutral", "friendly", "promo", "informative"]).default("friendly"),
  layout: z.enum(["two-block-cards", "three-list-items", "one-card-cta"]),
  title: z.string().max(60).optional(),
  body: z.string().max(220).optional(),
  cta: z.string().max(28),
});
type IntentT = z.infer<typeof Intent>;

export async function POST(req: NextRequest) {
  const { userIntent, businessIntent, dos, donts, prompt } = await req.json();

  const combined =
    prompt ??
    [
      `USER INTENT: ${userIntent ?? ""}`,
      `BUSINESS INTENT: ${businessIntent ?? ""}`,
      `DOS: ${dos ?? ""}`,
      `DONTS: ${donts ?? ""}`,
    ].join("\n");

  const system =
    `Extract a compact marketing intent JSON.\n` +
    `Choose ONE layout: two-block-cards | three-list-items | one-card-cta.\n` +
    `Keep strings short.\n` +
    `Return plain strings (not arrays). Title<=60, Body<=220, CTA<=28.`;

  const user =
    `PROMPT:\n${combined}\n\n` +
    `Return JSON object with keys: goal, tone("neutral"|"friendly"|"promo"|"informative"), layout, title?, body?, cta.\n` +
    `All values must be strings (no arrays).`;

  const openai = getOpenAI();
  const r = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.7,
    response_format: { type: "json_object" },
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
  });

  // Parse raw JSON from the model
  let raw: any = {};
  try {
    raw = JSON.parse(r.choices[0]?.message?.content || "{}");
  } catch {
    raw = {};
  }

  // Normalize fields that sometimes come back as arrays
  const normalized = {
    goal: asText(raw.goal),
    tone: asText(raw.tone),
    layout: asText(raw.layout),
    title: asText(raw.title),
    body: asText(raw.body),
    cta: asText(raw.cta),
  };

  // Validate after normalization
  const out = Intent.safeParse(normalized);
  if (!out.success) {
    return NextResponse.json(
      { error: "intent_parse_failed", issues: out.error.issues, raw },
      { status: 400 }
    );
  }

  return NextResponse.json(out.data satisfies IntentT);
}
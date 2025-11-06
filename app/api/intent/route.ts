export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // ensure Node runtime for OpenAI SDK

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

// Lazy init so env is read at runtime
function getOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    console.warn("⚠️ Missing OPENAI_API_KEY at runtime");
    throw new Error("Missing OPENAI_API_KEY");
  }
  return new OpenAI({ apiKey: key });
}

// Coerce array -> single string
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
  try {
    console.log("🟡 /api/intent called");

    const { userIntent, businessIntent, dos, donts, prompt } = await req.json().catch(() => ({} as any));
    if (!userIntent && !prompt) {
      return NextResponse.json(
        { error: "bad_request", message: "userIntent or prompt is required" },
        { status: 400 }
      );
    }

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
      `Keep strings short. Return plain strings (not arrays).\n` +
      `Limits: title<=60, body<=220, cta<=28.`;

    const userMsg =
      `PROMPT:\n${combined}\n\n` +
      `Return JSON object with keys: goal, tone("neutral"|"friendly"|"promo"|"informative"), layout, title?, body?, cta.`;

    const openai = getOpenAI();
    console.log("🔵 OpenAI request → gpt-4o-mini");

    const r = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: system }, { role: "user", content: userMsg }],
    });

    const rawText = r.choices?.[0]?.message?.content ?? "{}";
    console.log("🟣 OpenAI response length:", rawText.length);

    let raw: any = {};
    try {
      raw = JSON.parse(rawText);
    } catch {
      raw = {};
    }

    const normalized = {
      goal: asText(raw.goal),
      tone: asText(raw.tone),
      layout: asText(raw.layout),
      title: asText(raw.title),
      body: asText(raw.body),
      cta: asText(raw.cta),
    };

    const out = Intent.safeParse(normalized);
    if (!out.success) {
      console.warn("⚠️ intent_parse_failed", out.error.issues);
      return NextResponse.json(
        { error: "intent_parse_failed", issues: out.error.issues, raw },
        { status: 400 }
      );
    }

    console.log("✅ intent ok");
    return NextResponse.json(out.data satisfies IntentT);
  } catch (err: any) {
    console.error("❌ intent_failed:", err?.message || err);
    return NextResponse.json(
      { error: "intent_failed", message: String(err?.message || err) },
      { status: 500 }
    );
  }
}
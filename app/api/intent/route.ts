export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

/** Lazy OpenAI client: never throw at import / build time */
function getOpenAI(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

/** Coerce array / weird values -> single string */
function asText(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (typeof v === "string") return v;
  if (Array.isArray(v)) {
    const joined = v.filter((x) => typeof x === "string").join(" ").trim();
    return joined || undefined;
  }
  return String(v);
}

/** Intent schema */
const Intent = z.object({
  goal: z.string().max(200),
  tone: z
    .enum(["neutral", "friendly", "promo", "informative"])
    .default("friendly"),
  layout: z.enum(["two-block-cards", "three-list-items", "one-card-cta"]),
  title: z.string().max(60).optional(),
  body: z.string().max(220).optional(),
  cta: z.string().max(28),
});
type IntentT = z.infer<typeof Intent>;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as any;
    const { userIntent, businessIntent, dos, donts, prompt } = body;

    const combined =
      prompt ??
      [
        `USER INTENT: ${userIntent ?? ""}`,
        `BUSINESS INTENT: ${businessIntent ?? ""}`,
        `DOS: ${dos ?? ""}`,
        `DONTS: ${donts ?? ""}`,
      ].join("\n");

    const openai = getOpenAI();

    // No API key available → deterministic fallback so build never fails
    if (!openai) {
      console.warn(
        "[api/intent] OPENAI_API_KEY missing – returning static fallback intent"
      );
      const fallback: IntentT = {
        goal:
          "Preview-only: configure OPENAI_API_KEY to generate AI-driven intents.",
        tone: "friendly",
        layout: "one-card-cta",
        title: "Set up your AI configuration",
        body:
          "Add your OpenAI API key in the environment to let this tool turn user & business intents into UI-ready copy.",
        cta: "Got it",
      };
      return NextResponse.json(fallback);
    }

    const system =
      `Extract a compact marketing intent JSON.\n` +
      `Choose ONE layout: two-block-cards | three-list-items | one-card-cta.\n` +
      `Keep strings short. Return plain strings (not arrays).\n` +
      `Limits: title<=60, body<=220, cta<=28.`;

    const userMsg =
      `PROMPT:\n${combined}\n\n` +
      `Return JSON object with keys: goal, tone("neutral"|"friendly"|"promo"|"informative"), ` +
      `layout, title?, body?, cta.`;

    const r = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: userMsg },
      ],
    });

    const rawText = r.choices?.[0]?.message?.content ?? "{}";
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
      console.warn("[api/intent] intent_parse_failed", out.error.issues);
      return NextResponse.json(
        { error: "intent_parse_failed", issues: out.error.issues, raw },
        { status: 400 }
      );
    }

    return NextResponse.json(out.data satisfies IntentT);
  } catch (err: any) {
    console.error("[api/intent] intent_failed:", err?.message || err);
    return NextResponse.json(
      { error: "intent_failed", message: String(err?.message || err) },
      { status: 500 }
    );
  }
}
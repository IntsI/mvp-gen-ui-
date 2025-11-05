export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
console.log("🔑 OPENAI key present:", !!process.env.OPENAI_API_KEY);

const Intent = z.object({
  goal: z.string().max(200),
  tone: z.enum(["neutral","friendly","promo","informative"]).default("friendly"),
  layout: z.enum(["two-block-cards","three-list-items","one-card-cta"]),
  title: z.string().max(60).optional(),
  body:  z.string().max(220).optional(),
  cta:   z.string().max(28).optional()
});

export async function POST(req: NextRequest) {
  const { prompt, dos, donts } = await req.json();

  const system = `Extract a compact marketing intent JSON.
Choose ONE layout: two-block-cards | three-list-items | one-card-cta.
Keep strings short.`;
  const user = `PROMPT:\n${prompt}\n\nDOS: ${dos||"-"}\nDONTS: ${donts||"-"}\n\nReturn JSON: goal, tone(neutral|friendly|promo|informative), layout, title, body, cta.`;

  const r = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.7,
    response_format: { type: "json_object" },
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
  });

  let parsed: unknown;
  try { parsed = JSON.parse(r.choices[0]?.message?.content || "{}"); }
  catch { parsed = {}; }

  const out = Intent.safeParse(parsed);
  if (!out.success)
    return NextResponse.json({ error: "intent_parse_failed", issues: out.error.issues }, { status: 400 });
  return NextResponse.json(out.data);
}
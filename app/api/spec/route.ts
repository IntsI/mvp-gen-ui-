export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { UiSpecSchema } from "@/schemas/ui-spec";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { intent, style } = await req.json();

    const system = `Output ONLY JSON matching UiSpec schema:
- layout ∈ { two-block-cards, three-list-items, one-card-cta }
- style: { bg: hex, radius: "sm"|"lg" }
- components use only: Stage, Card, Media, Heading, Text, Button
Use placeholder media only. Respect limits: title<=60, body<=220, cta<=28. No HTML.`;

    const user = JSON.stringify({
      intent,
      style,
      want: "Filled spec with short copy and selected layout.",
    });

    const r = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.6,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    let json: unknown;
    try {
      json = JSON.parse(r.choices[0]?.message?.content || "{}");
    } catch {
      json = {};
    }

    const validated = UiSpecSchema.safeParse(json);
    if (!validated.success) {
      // ★ Safe fallback: return a plain object (no zod .parse here)
      const fallback = {
        layout: intent?.layout ?? "one-card-cta",
        style: style ?? { bg: "#FFFFFF", radius: "lg" },
        components: [
          {
            kind: "Stage",
            children: [
              {
                kind: "Card",
                props: {
                  variant:
                    (intent?.layout ?? "") === "three-list-items" ? "list" : "block",
                },
                children: [
                  { kind: "Media", slots: [{ slot: "media", kind: "placeholder" }] },
                  {
                    kind: "Heading",
                    slots: [
                      { slot: "title", text: intent?.title || intent?.goal || "Update" },
                    ],
                  },
                  {
                    kind: "Text",
                    slots: [{ slot: "body", text: intent?.body || "…" }],
                  },
                  {
                    kind: "Button",
                    slots: [
                      {
                        slot: "cta",
                        label: intent?.cta || "Learn more",
                        action: "cta.click",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };
      return NextResponse.json(fallback); // ★ no UiSpecSchema.parse here
    }

    return NextResponse.json(validated.data);
  } catch (e: any) {
    console.error("spec route error:", e?.message || e);
    // ★ Return a minimal safe JSON (never an empty body)
    return NextResponse.json(
      { error: "spec_failed", message: String(e?.message || e) },
      { status: 500 }
    );
  }
}
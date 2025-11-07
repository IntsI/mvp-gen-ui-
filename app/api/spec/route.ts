export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import {
  UiSpecSchema,
  type UiSpec,
  type NodeT,
} from "@/schemas/ui-spec";

/* ---------- OpenAI helper (no throw at import) ---------- */

function getOpenAI(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

/* ---------- Normalizers ---------- */

function normalizeCardSlotsToChildren(node: NodeT): NodeT {
  if (node.kind !== "Card") return node;

  const children: NodeT[] = Array.isArray(node.children)
    ? [...node.children]
    : [];

  const title = node.slots?.find((s: any) => s.slot === "title") as any;
  const body = node.slots?.find((s: any) => s.slot === "body") as any;
  const cta = node.slots?.find((s: any) => s.slot === "cta") as any;

  const hasHeading = children.some((c) => c.kind === "Heading");
  const hasText = children.some((c) => c.kind === "Text");
  const hasButton = children.some((c) => c.kind === "Button");

  if (title && !hasHeading) {
    children.push({
      kind: "Heading",
      slots: [{ slot: "title", text: String(title.text ?? "") }],
    } as any);
  }

  if (body && !hasText) {
    children.push({
      kind: "Text",
      slots: [{ slot: "body", text: String(body.text ?? "") }],
    } as any);
  }

  if (cta && !hasButton && cta.label) {
    children.push({
      kind: "Button",
      slots: [
        {
          slot: "cta",
          label: String(cta.label),
          action: String(cta.action ?? "cta.click"),
        },
      ],
    } as any);
  }

  const remainingSlots = (node.slots ?? []).filter(
    (s: any) => !["title", "body", "cta"].includes(s.slot)
  );

  return {
    ...node,
    slots: remainingSlots.length ? remainingSlots : undefined,
    children,
  };
}

function normalizeTree(node: NodeT): NodeT {
  let out = node;
  if (out.kind === "Card") out = normalizeCardSlotsToChildren(out);
  if (Array.isArray(out.children)) {
    out = { ...out, children: out.children.map(normalizeTree) };
  }
  return out;
}

function ensureStage(spec: UiSpec): UiSpec {
  const first = spec.components?.[0];
  if (first && first.kind === "Stage") return spec;

  return {
    ...spec,
    components: [
      {
        kind: "Stage",
        children: spec.components as any,
      } as any,
    ],
  };
}

/* ---------- Fallback + safety ---------- */

function buildFallback(intent: any): UiSpec {
  return {
    layout: "one-card-cta",
    style: { bg: "#FFFFFF", radius: "lg" },
    components: [
      {
        kind: "Stage",
        children: [
          {
            kind: "Card",
            slots: [
              {
                slot: "title",
                text:
                  intent?.title ||
                  intent?.goal ||
                  "Welcome",
              },
              {
                slot: "body",
                text:
                  intent?.body ||
                  "Stay tuned for our latest offers and updates.",
              },
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
  };
}

function ensureNonEmpty(spec: UiSpec, intent: any): UiSpec {
  if (!spec.components?.length) return buildFallback(intent);

  const first = spec.components[0];
  if (!first || first.kind !== "Stage") return buildFallback(intent);

  const children = (first.children || []) as NodeT[];
  const hasCard = children.some((c: NodeT) => c.kind === "Card");
  if (!hasCard) return buildFallback(intent);

  return spec;
}

/* ---------- Handler ---------- */

export async function POST(req: NextRequest) {
  try {
    const { intent } = await req.json();
    const openai = getOpenAI();

    // No key → use deterministic fallback spec (prevents build-time failure)
    if (!openai) {
      console.warn(
        "[api/spec] OPENAI_API_KEY missing – returning fallback UiSpec"
      );
      const fallback = buildFallback(intent);
      return NextResponse.json(fallback);
    }

    const system = `
You generate a UiSpec JSON for a small 400x400 marketing surface.

Allowed node kinds ONLY:
- "Stage"
- "Grid"
- "Card"
- "Media"
- "Heading"
- "Text"
- "Button"

Do NOT invent other kinds like Hero, Section, Container, Row, etc.

Slots:
- title: { "slot": "title", "text": string (<= 60 chars) }
- body:  { "slot": "body",  "text": string (<= 220 chars) }
- cta:   { "slot": "cta",   "label": string (<= 28), "action": string (<= 120) }
- media: { "slot": "media", "kind": "placeholder" | "image", "id"?: string }

Style (fixed):
"style": { "bg": "#FFFFFF", "radius": "lg" }

Layout:
Use one of:
- "one-card-cta"
- "two-block-cards"
- "three-list-items"
- "four-grid-cards"

Prefer "one-card-cta" when there is a single clear offer.

Structure:
- Always have a Stage as the first component (or it will be wrapped).
- For "one-card-cta": one main Card with title, body, cta, optional media.
- Use intent.cta for Button label when appropriate.
- Keep copy concise and within limits.
- Return ONLY valid JSON (no markdown, no comments).
`.trim();

    const user = `
INTENT JSON:
${JSON.stringify(intent, null, 2)}

Return UiSpec:
{
  "layout": "...",
  "style": { "bg": "#FFFFFF", "radius": "lg" },
  "components": [ ... ]
}
`.trim();

    const r = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.6,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    let json: any = {};
    try {
      json = JSON.parse(r.choices[0]?.message?.content || "{}");
    } catch {
      json = {};
    }

    if (Array.isArray(json?.components)) {
      json.components = json.components.map((n: NodeT) => normalizeTree(n));
    }

    json.style = { bg: "#FFFFFF", radius: "lg" };

    if (!Array.isArray(json?.components) || !json.components.length) {
      json = buildFallback(intent);
    } else {
      const tmp: UiSpec = {
        layout: json.layout ?? "one-card-cta",
        style: json.style,
        components: json.components,
      };
      json = ensureStage(tmp);
    }

    const validated = UiSpecSchema.safeParse(json);
    if (validated.success) {
      const safe = ensureNonEmpty(validated.data, intent);
      return NextResponse.json(safe);
    }

    console.error(
      "[api/spec] UiSpec validation failed:",
      validated.error.flatten()
    );
    const fallback = buildFallback(intent);
    return NextResponse.json(fallback);
  } catch (e: any) {
    console.error("[api/spec] spec_failed:", e?.message || e);
    return NextResponse.json(
      { error: "spec_failed", message: String(e?.message || e) },
      { status: 500 }
    );
  }
}
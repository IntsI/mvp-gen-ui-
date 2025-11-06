export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { UiSpecSchema, type UiSpec, type NodeT } from "@/schemas/ui-spec";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/** --- Normalizers ------------------------------------------------------- */

// Move Card-level slots (title/body/cta) into child nodes so the renderer shows them.
function normalizeCardSlotsToChildren(node: NodeT): NodeT {
  if (node.kind !== "Card") return node;

  const children: NodeT[] = Array.isArray(node.children) ? [...node.children] : [];

  const title = node.slots?.find((s: any) => s.slot === "title") as any | undefined;
  const body  = node.slots?.find((s: any) => s.slot === "body") as any | undefined;
  const cta   = node.slots?.find((s: any) => s.slot === "cta") as any | undefined;

  // If card already has Heading/Text/Button children, don't duplicate.
  const hasHeading = children.some((c) => c.kind === "Heading");
  const hasText    = children.some((c) => c.kind === "Text");
  const hasButton  = children.some((c) => c.kind === "Button");

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
          action: String((cta.action ?? "cta.click")),
        },
      ],
    } as any);
  }

  // Strip those card-level slots; keep others like media if needed
  const remainingSlots = (node.slots ?? []).filter(
    (s: any) => !["title", "body", "cta"].includes(s.slot)
  );

  return { ...node, slots: remainingSlots.length ? remainingSlots : undefined, children };
}

// Recursively normalize the whole tree
function normalizeTree(node: NodeT): NodeT {
  let out = node;
  if (out.kind === "Card") {
    out = normalizeCardSlotsToChildren(out);
  }
  if (Array.isArray(out.children)) {
    out = { ...out, children: out.children.map(normalizeTree) };
  }
  return out;
}

// Ensure there is a Stage at the top level
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

/** ---------------------------------------------------------------------- */

export async function POST(req: NextRequest) {
  try {
    const { intent } = await req.json();

    const system =
      `You generate a UiSpec JSON for a small marketing surface.\n` +
      `Allowed components: Stage, Grid, Card, Media, Heading, Text, Button.\n` +
      `Use 'slots': title, body, cta(label, action), media(kind="placeholder").\n` +
      `Style is FIXED: bg "#FFFFFF", radius "lg". Do not vary.\n` +
      `Prefer providing Heading/Text/Button as children of Card.\n` +
      `Use intent.cta for the Button label; set action to a reasonable string (URL or "cta.click").\n` +
      `Respect limits: title<=60, body<=220, cta<=28. No HTML.`;

    const user =
      `INTENT JSON:\n${JSON.stringify(intent, null, 2)}\n` +
      `Return UiSpec { layout, style:{bg:"#FFFFFF", radius:"lg"}, components:[Node...] }`;

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

    // Post-process BEFORE validation
    if (Array.isArray(json?.components)) {
      json.components = json.components.map((n: NodeT) => normalizeTree(n));
    }
    // Enforce fixed style
    json.style = { bg: "#FFFFFF", radius: "lg" };
    // Ensure Stage wrapper
    if (!Array.isArray(json?.components) || !json.components.length) {
      json.components = [
        {
          kind: "Stage",
          children: [
            {
              kind: "Card",
              children: [
                { kind: "Heading", slots: [{ slot: "title", text: intent?.title ?? intent?.goal ?? "Welcome" }] },
                { kind: "Text",    slots: [{ slot: "body",  text: intent?.body  ?? "—" }] },
                { kind: "Button",  slots: [{ slot: "cta",   label: intent?.cta   ?? "Get started", action: "cta.click" }] },
              ],
            },
          ],
        },
      ];
    } else {
      // If top-level isn't Stage, wrap it
      const tmp: UiSpec = { layout: json.layout ?? "one-card-cta", style: json.style, components: json.components };
      json = ensureStage(tmp);
    }

    // Validate and return
    const validated = UiSpecSchema.safeParse(json);
    if (validated.success) {
      return NextResponse.json(validated.data);
    }

    // Schema still unhappy? Send a minimal valid fallback
    const fallback: UiSpec = {
      layout: "one-card-cta",
      style: { bg: "#FFFFFF", radius: "lg" },
      components: [
        {
          kind: "Stage",
          children: [
            {
              kind: "Card",
              children: [
                { kind: "Heading", slots: [{ slot: "title", text: intent?.title ?? intent?.goal ?? "Welcome" }] },
                { kind: "Text",    slots: [{ slot: "body",  text: intent?.body  ?? "—" }] },
                { kind: "Button",  slots: [{ slot: "cta",   label: intent?.cta   ?? "Get started", action: "cta.click" }] },
              ],
            },
          ],
        },
      ],
    };
    return NextResponse.json(fallback);
  } catch (e: any) {
    console.error("spec route error:", e?.message || e);
    return NextResponse.json(
      { error: "spec_failed", message: String(e?.message || e) },
      { status: 500 }
    );
  }
}
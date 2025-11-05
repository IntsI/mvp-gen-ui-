import { z } from "zod";

export const Slot = z.discriminatedUnion("slot", [
  z.object({ slot: z.literal("title"), text: z.string().max(60) }),
  z.object({ slot: z.literal("body"), text: z.string().max(220) }),
  z.object({
    slot: z.literal("cta"),
    label: z.string().max(28),
    action: z.string().max(120),
  }),
  z.object({ slot: z.literal("media"), kind: z.enum(["placeholder"]) }),
]);

// Node schema
export const Node: z.ZodType<any> = z.lazy(() =>
  z.object({
    kind: z.enum(["Stage", "Grid", "Card", "Media", "Heading", "Text", "Button"]),
    // 👇 Vercel build fix: specify key type explicitly
    props: z.record(z.string(), z.any()).optional(),
    slots: z.array(Slot).optional(),
    children: z.array(Node).optional(),
  })
);

export const UiSpecSchema = z.object({
  layout: z.enum([
    "two-block-cards",
    "three-list-items",
    "one-card-cta",
    "four-grid-cards",
  ]),
  style: z.object({
    bg: z
      .string()
      .regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
      .default("#FFFFFF"),
  radius: z.enum(["sm", "lg"]).default("lg"),
  }),
  components: z.array(Node).min(1),
});

export type UiSpec = z.infer<typeof UiSpecSchema>;
export type NodeT = z.infer<typeof Node>;
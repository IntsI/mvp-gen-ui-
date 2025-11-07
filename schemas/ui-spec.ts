// schemas/ui-spec.ts
import { z } from "zod";

/** Slot schema */
export const Slot = z.discriminatedUnion("slot", [
  z.object({
    slot: z.literal("title"),
    text: z.string().max(60),
  }),
  z.object({
    slot: z.literal("body"),
    text: z.string().max(220),
  }),
  z.object({
    slot: z.literal("cta"),
    label: z.string().max(28),
    action: z.string().max(120),
  }),
  z.object({
    slot: z.literal("media"),
    kind: z.enum(["placeholder", "image"]).default("placeholder"),
    id: z.string().optional(), // catalog id when kind === "image"
  }),
]);

/** Node schema (recursive) */
export const Node: z.ZodType<any> = z.lazy(() =>
  z.object({
    kind: z.enum([
      "Stage",
      "Grid",
      "Card",
      "Media",
      "Heading",
      "Text",
      "Button",
    ]),
    props: z.record(z.string(), z.any()).optional(),
    slots: z.array(Slot).optional(),
    children: z.array(Node).optional(),
  })
);

/** Style schema: fixed literals */
const StyleSchema = z
  .object({
    bg: z.literal("#FFFFFF"),
    radius: z.literal("lg"),
  })
  .default({ bg: "#FFFFFF", radius: "lg" });

/** UiSpec schema */
export const UiSpecSchema = z.object({
  layout: z.enum([
    "two-block-cards",
    "three-list-items",
    "one-card-cta",
    "four-grid-cards",
  ]),
  style: StyleSchema,
  components: z.array(Node).min(1),
});

export type UiSpec = z.infer<typeof UiSpecSchema>;
export type NodeT = z.infer<typeof Node>;
// ui/Renderer.tsx
import * as DS from "@/components/ds";
import type { UiSpec, NodeT } from "@/schemas/ui-spec";
import React from "react";

/** --- Slot helpers --- */
function slotText(n: NodeT, name: "title" | "body"): string | undefined {
  const s = n.slots?.find((x: any) => x.slot === name) as any;
  return s?.text ? String(s.text) : undefined;
}
function slotCta(n: NodeT): { label: string; action?: string } | undefined {
  const s = n.slots?.find((x: any) => x.slot === "cta") as any;
  if (!s?.label) return undefined;
  return { label: String(s.label), action: s.action ? String(s.action) : undefined };
}
function hasChildOf(n: NodeT, kind: NodeT["kind"]): boolean {
  const children: NodeT[] = Array.isArray(n.children) ? (n.children as NodeT[]) : [];
  return children.some((c: NodeT) => c.kind === kind);
}

/** --- Dispatch --- */
function renderNode(
  n: NodeT,
  i: number,
  _style: UiSpec["style"], // kept for signature compatibility (unused)
  layout?: UiSpec["layout"]
): React.ReactNode {
  switch (n.kind) {
    case "Stage": {
      // full-bleed for one-card-cta: Stage has no padding
      const padded = layout !== "one-card-cta";
      return (
        <DS.Stage key={i} padded={padded as any /* keep TS calm */}>
          {(n.children ?? []).map((c: NodeT, idx: number) =>
            renderNode(c, idx, _style, layout)
          )}
        </DS.Stage>
      );
    }

    case "Grid":
      return (
        <DS.Grid key={i}>
          {(n.children ?? []).map((c: NodeT, idx: number) =>
            renderNode(c, idx, _style, layout)
          )}
        </DS.Grid>
      );

    case "Card": {
      // Fixed styling: white + rounded-lg
      const title = slotText(n, "title");
      const body = slotText(n, "body");
      const cta = slotCta(n);

      const hasHeadingChild = hasChildOf(n, "Heading");
      const hasTextChild = hasChildOf(n, "Text");
      const hasButtonChild = hasChildOf(n, "Button");
      const hasMediaChild = hasChildOf(n, "Media");
      const hasMediaSlot = (n.slots ?? []).some((s: any) => s.slot === "media");

      const card = (
        <DS.Card
          key={i}
          bg="#FFFFFF"
          radius="lg"
          variant={(n.props as any)?.variant || "block"}
        >
          {/* If model added a media slot but no Media child, show a placeholder */}
          {!hasMediaChild && hasMediaSlot && <DS.Media size="full" />}

          {/* If model put copy on the Card slots (not as children), render them */}
          {!hasHeadingChild && title && <DS.Heading>{title}</DS.Heading>}
          {!hasTextChild && body && (
            <DS.Text muted={Boolean((n.props as any)?.muted)}>{body}</DS.Text>
          )}
          {!hasButtonChild && cta?.label && <DS.Button label={cta.label} />}

          {/* Then render any children that do exist */}
          {(n.children ?? []).map((c: NodeT, idx: number) =>
            renderNode(c, idx, _style, layout)
          )}
        </DS.Card>
      );

      // If we want the card to fill the 400x400 Stage, wrap with h-full
      if (layout === "one-card-cta") {
        return (
          <div key={`wrap-${i}`} className="h-full">
            {card}
          </div>
        );
      }
      return card;
    }

    case "Media":
      return <DS.Media key={i} size={(n.props as any)?.size || "full"} />;

    case "Heading":
      return <DS.Heading key={i}>{slotText(n, "title")}</DS.Heading>;

    case "Text":
      return (
        <DS.Text key={i} muted={Boolean((n.props as any)?.muted)}>
          {slotText(n, "body")}
        </DS.Text>
      );

    case "Button": {
      // Prefer model-generated CTA; avoid deterministic fallback
      const cta = slotCta(n);
      if (!cta?.label) return null;
      return <DS.Button key={i} label={cta.label} />;
    }

    default:
      return null;
  }
}

/** --- Public renderer --- */
export function RenderUi({ spec }: { spec: UiSpec }) {
  return (
    <>
      {spec.components.map((c: NodeT, i: number) =>
        renderNode(c, i, spec.style, spec.layout)
      )}
    </>
  );
}
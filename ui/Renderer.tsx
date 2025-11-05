import * as DS from "@/components/ds";
import type { UiSpec, NodeT } from "@/schemas/ui-spec";
import React from "react";

function slotText(n: NodeT, name: "title" | "body"): string | undefined {
  const s = n.slots?.find((x: any) => x.slot === name) as any;
  return s?.text;
}
function slotCta(n: NodeT): string | undefined {
  const s = n.slots?.find((x: any) => x.slot === "cta") as any;
  return s?.label;
}

function renderNode(
  n: NodeT,
  i: number,
  style: UiSpec["style"],
  layout?: UiSpec["layout"]
): React.ReactNode {
  switch (n.kind) {
    case "Stage": {
      // full-bleed for one-card-cta: Stage has no padding
      const padded = layout !== "one-card-cta";
      return (
        <DS.Stage key={i} padded={padded as any /* keep TS calm */}>
          {(n.children ?? []).map((c: NodeT, idx: number) =>
            renderNode(c, idx, style, layout)
          )}
        </DS.Stage>
      );
    }

    case "Grid":
      return (
        <DS.Grid key={i}>
          {(n.children ?? []).map((c: NodeT, idx: number) =>
            renderNode(c, idx, style, layout)
          )}
        </DS.Grid>
      );

    case "Card": {
      const card = (
        <DS.Card
          key={i}
          bg={(n.props as any)?.bg || style.bg}
          radius={(n.props as any)?.radius || style.radius}
          variant={(n.props as any)?.variant || "block"}
        >
          {(n.children ?? []).map((c: NodeT, idx: number) =>
            renderNode(c, idx, style, layout)
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

    case "Button":
      return <DS.Button key={i} label={slotCta(n) || "OK"} />;

    default:
      return null;
  }
}

export function RenderUi({ spec }: { spec: UiSpec }) {
  return (
    <>
      {spec.components.map((c: NodeT, i: number) =>
        renderNode(c, i, spec.style, spec.layout)
      )}
    </>
  );
}
import * as DS from "@/components/ds";
import { UiSpec, NodeT } from "@/schemas/ui-spec";

function renderNode(n: NodeT, i: number, style: UiSpec["style"]): React.ReactNode {
  switch (n.kind) {
    case "Stage":
      return (
        <DS.Stage key={i}>
          {n.children?.map((c, idx) => renderNode(c, idx, style))}
        </DS.Stage>
      );
    case "Card":
      return (
        <DS.Card
          key={i}
          bg={n.props?.bg || style.bg}
          radius={n.props?.radius || style.radius}
          variant={n.props?.variant || "block"}
        >
          {n.children?.map((c, idx) => renderNode(c, idx, style))}
        </DS.Card>
      );
    case "Media":
      return <DS.Media key={i} size={n.props?.size || "full"} />;
    case "Heading":
      return (
        <DS.Heading key={i}>
          {(n.slots?.find((s) => s.slot === "title") as any)?.text}
        </DS.Heading>
      );
    case "Text":
      return (
        <DS.Text key={i} muted={!!n.props?.muted}>
          {(n.slots?.find((s) => s.slot === "body") as any)?.text}
        </DS.Text>
      );
    case "Button":
      return (
        <DS.Button
          key={i}
          label={
            (n.slots?.find((s) => s.slot === "cta") as any)?.label || "OK"
          }
        />
      );
  }
}

export function RenderUi({ spec }: { spec: UiSpec }) {
  return <>{spec.components.map((c, i) => renderNode(c, i, spec.style))}</>;
}
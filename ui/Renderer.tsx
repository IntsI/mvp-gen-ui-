// ui/Renderer.tsx
import * as DS from "@/components/ds";
import type { UiSpec, NodeT } from "@/schemas/ui-spec";
import React from "react";

/* ---------- Slot helpers ---------- */

function slotText(n: NodeT, name: "title" | "body"): string | undefined {
  const s = n.slots?.find((x: any) => x.slot === name) as any;
  return s?.text ? String(s.text) : undefined;
}

function slotCtaLabel(n: NodeT): string | undefined {
  const s = n.slots?.find((x: any) => x.slot === "cta") as any;
  return s?.label ? String(s.label) : undefined;
}

function hasChildOf(n: NodeT, kind: NodeT["kind"]): boolean {
  const children: NodeT[] = Array.isArray(n.children)
    ? (n.children as NodeT[])
    : [];
  return children.some((c: NodeT) => c.kind === kind);
}

/* ---------- Aggregate readers ---------- */

function getCardTitle(n: NodeT): string | undefined {
  const self = slotText(n, "title");
  if (self) return self;

  const child = (n.children ?? []).find(
    (c: NodeT) => c.kind === "Heading"
  );
  return child ? slotText(child, "title") : undefined;
}

function getCardBody(n: NodeT): string | undefined {
  const self = slotText(n, "body");
  if (self) return self;

  const child = (n.children ?? []).find(
    (c: NodeT) => c.kind === "Text"
  );
  return child ? slotText(child, "body") : undefined;
}

function getCardCta(n: NodeT): string | undefined {
  const self = slotCtaLabel(n);
  if (self) return self;

  const child = (n.children ?? []).find(
    (c: NodeT) => c.kind === "Button"
  );
  return child ? slotCtaLabel(child) : undefined;
}

function getMediaSlot(
  n: NodeT
): { kind: "placeholder" | "image"; id?: string } | null {
  const s = n.slots?.find((x: any) => x.slot === "media") as any;
  if (!s) return null;

  const kind: "placeholder" | "image" =
    s.kind === "image" || s.kind === "placeholder"
      ? s.kind
      : "placeholder";

  return {
    kind,
    id: typeof s.id === "string" ? s.id : undefined,
  };
}

/* ---------- Dispatcher ---------- */

function renderNode(
  n: NodeT,
  i: number,
  _style: UiSpec["style"],
  layout?: UiSpec["layout"]
): React.ReactNode {
  switch (n.kind) {
    case "Stage": {
      const isOneCard = layout === "one-card-cta";

      if (isOneCard) {
        // 400x400 frame; Card inside owns the visual chrome.
        return (
          <div key={i} className="w-[400px] h-[400px]">
            {(n.children ?? []).map((c: NodeT, idx: number) =>
              renderNode(c, idx, _style, layout)
            )}
          </div>
        );
      }

      return (
        <DS.Stage key={i} padded={true as any}>
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
      const isOneCard = layout === "one-card-cta";

      /* ----- one-card-cta hero layout ----- */
      if (isOneCard) {
        const title = getCardTitle(n);
        const body = getCardBody(n);
        const cta = getCardCta(n);
        const media = getMediaSlot(n);

        return (
          <DS.Card
            key={i}
            bg="#FFFFFF"
            radius="lg"
            variant="block"
            fullHeight={true}
          >
            <div className="flex flex-col h-full gap-4">
              {/* Media on top: fills leftover vertical space */}
              <div className="flex-1 flex items-stretch">
                <DS.Media
                  size="full"
                  kind={media?.kind || "placeholder"}
                  id={media?.id}
                />
              </div>

              {/* Text */}
              <div className="flex-none flex flex-col gap-2">
                {title && <DS.Heading>{title}</DS.Heading>}
                {body && <DS.Text>{body}</DS.Text>}
              </div>

              {/* CTA */}
              {cta && (
                <div className="flex-none">
                  <DS.Button label={cta} />
                </div>
              )}
            </div>
          </DS.Card>
        );
      }

      /* ----- default cards for other layouts ----- */

      const title = slotText(n, "title");
      const body = slotText(n, "body");
      const cta = slotCtaLabel(n);
      const hasHeadingChild = hasChildOf(n, "Heading");
      const hasTextChild = hasChildOf(n, "Text");
      const hasButtonChild = hasChildOf(n, "Button");
      const hasMediaChild = hasChildOf(n, "Media");
      const media = getMediaSlot(n);

      const children: React.ReactNode[] = [];

      if (!hasMediaChild && media) {
        children.push(
          <DS.Media
            key="slot-media"
            size="full"
            kind={media.kind}
            id={media.id}
          />
        );
      }

      if (!hasHeadingChild && title) {
        children.push(
          <DS.Heading key="auto-heading">
            {title}
          </DS.Heading>
        );
      }

      if (!hasTextChild && body) {
        children.push(
          <DS.Text key="auto-text">
            {body}
          </DS.Text>
        );
      }

      if (!hasButtonChild && cta) {
        children.push(
          <DS.Button key="auto-cta" label={cta} />
        );
      }

      (n.children ?? []).forEach((c: NodeT, idx: number) => {
        children.push(renderNode(c, idx, _style, layout));
      });

      return (
        <DS.Card
          key={i}
          bg="#FFFFFF"
          radius="lg"
          variant={(n.props as any)?.variant || "block"}
        >
          {children}
        </DS.Card>
      );
    }

    case "Media":
      return (
        <DS.Media
          key={i}
          size={(n.props as any)?.size || "full"}
          kind={(n.props as any)?.kind || "placeholder"}
          id={(n.props as any)?.id}
        />
      );

    case "Heading":
      return (
        <DS.Heading key={i}>
          {slotText(n, "title")}
        </DS.Heading>
      );

    case "Text":
      return (
        <DS.Text
          key={i}
          muted={Boolean((n.props as any)?.muted)}
        >
          {slotText(n, "body")}
        </DS.Text>
      );

    case "Button": {
      const label = slotCtaLabel(n);
      if (!label) return null;
      return <DS.Button key={i} label={label} />;
    }

    default:
      return null;
  }
}

/* ---------- Public API ---------- */

export function RenderUi({ spec }: { spec: UiSpec }) {
  if (!spec || !Array.isArray(spec.components)) return null;

  return (
    <>
      {spec.components.map((c: NodeT, i: number) =>
        renderNode(c, i, spec.style, spec.layout)
      )}
    </>
  );
}
// components/ds/Media.tsx
import React from "react";
import { resolveMediaUrl } from "@/lib/media-catalog";

type MediaProps = {
  size?: "full";
  kind?: "placeholder" | "image";
  id?: string;
};

/**
 * Media
 * - Parent controls height.
 * - We always fill width/height of the container.
 */
export function Media({
  size = "full",
  kind = "placeholder",
  id,
}: MediaProps) {
  const url = kind === "image" ? resolveMediaUrl(id) : undefined;

  // full = take all the space parent gives (hero use-case)
  const base =
    size === "full"
      ? "w-full h-full"
      : "w-full h-24";

  return (
    <div
      className={`${base} rounded-2xl overflow-hidden bg-gray-200 flex items-center justify-center`}
    >
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="w-full h-full object-cover" />
      )}
    </div>
  );
}
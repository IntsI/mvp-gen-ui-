// components/ds/Media.tsx
import React from "react";
import { MEDIA_CATALOG } from "@/lib/media-catalog";

type MediaProps = {
  size?: "full" | "small";
  kind?: "placeholder" | "image";
  id?: string;
};

export function Media({
  size = "full",
  kind = "placeholder",
  id,
}: MediaProps) {
  const hClass = size === "full" ? "h-full" : "h-16";

  if (kind === "image" && id) {
    const item = MEDIA_CATALOG.find((m) => m.id === id);
    if (item) {
      return (
        <img
          src={item.url}
          alt=""
          className={`w-full ${hClass} object-cover rounded-xl`}
        />
      );
    }
  }

  // Fallback: if no valid image -> simple placeholder
  return (
    <div className={`w-full ${hClass} bg-gray-200 rounded-xl`} />
  );
}
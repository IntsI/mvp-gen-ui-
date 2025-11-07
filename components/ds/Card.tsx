import React from "react";

export function Card({
  bg = "#FFFFFF",
  radius = "lg",
  variant = "block",
  fullHeight = false,
  children,
}: {
  bg?: string;
  radius?: "sm" | "lg";
  variant?: "block" | "list";
  fullHeight?: boolean;
  children?: React.ReactNode;
}) {
  // base visual: border, shadow, optional full height
  const base = `border border-gray-200 shadow-sm ${
    fullHeight ? "h-full" : ""
  }`;

  // 16px padding
  const pad = "p-4";

  // radius token
  const r = radius === "lg" ? "rounded-3xl" : "rounded-xl"; // feel free to keep xl/md if you prefer
  const style = { background: bg };

  // Horizontal list style
  if (variant === "list") {
    return (
      <div
        className={`${base} ${pad} ${r} flex gap-3 items-start`}
        style={style}
      >
        {children}
      </div>
    );
  }

  // Default: vertical card, flex column to allow CTA at bottom
  return (
    <div
      className={`${base} ${pad} ${r} flex flex-col gap-3`}
      style={style}
    >
      {children}
    </div>
  );
}
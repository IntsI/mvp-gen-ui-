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
  fullHeight?: boolean;            // ⬅️ add this prop
  children?: React.ReactNode;
}) {
  const base = `border border-gray-200 shadow-sm ${fullHeight ? "h-full" : ""}`; // ⬅️ apply it
  const pad = "p-3";
  const r = radius === "lg" ? "rounded-xl" : "rounded-md";
  const style = { background: bg };

  if (variant === "list") {
    return (
      <div className={`${base} ${pad} ${r} flex gap-3 items-start`} style={style}>
        {children}
      </div>
    );
  }

  return (
    <div className={`${base} ${pad} ${r} flex flex-col gap-2`} style={style}>
      {children}
    </div>
  );
}
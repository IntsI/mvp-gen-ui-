export function Media({ size="full" }:{ size?: "full" | "thumb" }) {
    const cls = size === "thumb" ? "w-16 h-16 rounded-lg" : "w-full h-24 rounded-xl";
    return <div className={`bg-gray-200 ${cls}`} />;
  }
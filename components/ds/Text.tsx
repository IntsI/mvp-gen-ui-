export function Text({ children, muted=false }:{ children?: React.ReactNode; muted?: boolean }) {
    return <p className={`text-sm leading-snug ${muted ? "text-gray-500" : "text-gray-700"}`}>{children}</p>;
  }
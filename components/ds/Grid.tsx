export function Grid({ children }: { children?: React.ReactNode }) {
    return <div className="grid grid-cols-2 gap-3 h-full">{children}</div>;
  }
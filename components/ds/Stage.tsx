export function Stage({
  children,
  padded = true,
}: {
  children: React.ReactNode;
  padded?: boolean;
}) {
  return (
    <div
      className={`w-[400px] h-[400px] ${
        padded ? "p-3" : ""
      } rounded-2xl border border-gray-200 bg-white shadow-sm overflow-auto`}
    >
      {children}
    </div>
  );
}
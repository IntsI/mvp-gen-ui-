export function Stage({ children }: { children: React.ReactNode }) {
    return (
      <div className="w-[400px] h-[400px] p-3 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-auto">
        {children}
      </div>
    );
  }
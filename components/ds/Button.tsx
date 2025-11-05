export function Button({ label, onClick }:{ label: string; onClick?: ()=>void }) {
    return (
      <button onClick={onClick} className="px-3 py-1.5 rounded-xl text-sm border bg-white text-gray-900 border-gray-300">
        {label}
      </button>
    );
  }
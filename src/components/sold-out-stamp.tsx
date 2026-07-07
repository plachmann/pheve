export function SoldOutStamp({ className = "absolute right-2 top-3" }: { className?: string }) {
  return (
    <span
      className={`pointer-events-none -rotate-12 border-2 border-pheve-red bg-black/70 px-2 py-0.5 text-xs font-black uppercase tracking-widest text-pheve-red ${className}`}
    >
      Sold out
    </span>
  );
}

export function ComingSoonBanner({ className }: { className?: string }) {
  return (
    <div className={`border-2 border-pheve-red bg-pheve-red/10 p-5 ${className ?? ""}`}>
      <p className="eyebrow">Coming soon</p>
      <p className="mt-2 font-display text-2xl uppercase">The store opens soon</p>
      <p className="mt-1 text-zinc-400">
        We’re stocking the merch table. Follow us and you’ll be first to know when it drops.
      </p>
    </div>
  );
}

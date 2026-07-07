export function PageHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <header>
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="headline-skew mt-2 font-display text-5xl uppercase tracking-wide md:text-6xl">
        {title}
      </h1>
    </header>
  );
}

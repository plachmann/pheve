"use client";

import Link from "next/link";
import { useState } from "react";

export function MobileNav({ links }: { links: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        className="flex h-11 w-11 flex-col items-center justify-center gap-1.5"
        onClick={() => setOpen(!open)}
      >
        <span
          className={`h-0.5 w-6 bg-white transition-transform ${
            open ? "translate-y-2 rotate-45" : ""
          }`}
        />
        <span className={`h-0.5 w-6 bg-white ${open ? "opacity-0" : ""}`} />
        <span
          className={`h-0.5 w-6 bg-white transition-transform ${
            open ? "-translate-y-2 -rotate-45" : ""
          }`}
        />
      </button>
      {open ? (
        <div
          id="mobile-menu"
          className="absolute inset-x-0 top-full z-50 border-b-2 border-pheve-red bg-black"
        >
          <nav className="shell flex flex-col py-4">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="py-3 text-lg font-bold uppercase tracking-wider hover:text-pheve-red"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
    </div>
  );
}

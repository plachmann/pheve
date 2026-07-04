import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "PHEVE — Live Cover Band",
  description: "PHEVE plays the songs you know. Shows, merch, and booking.",
};

const NAV_LINKS = [
  { href: "/shows", label: "Shows" },
  { href: "/store", label: "Store" },
  { href: "/gallery", label: "Gallery" },
  { href: "/booking", label: "Booking" },
];

const SOCIAL_LINKS = [
  { href: "https://www.facebook.com/PHEVEband", label: "Facebook" },
  { href: "https://www.instagram.com/pheveband/", label: "Instagram" },
  { href: "https://venmo.com/pheve", label: "Venmo Tips" },
];

function Nav() {
  return (
    <header className="border-b border-zinc-800">
      <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-4">
        <Link href="/" className="text-xl font-black tracking-widest">
          PHEVE
        </Link>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-zinc-300">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-white">
              {link.label}
            </Link>
          ))}
          {/* cart-link */}
        </div>
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-16 border-t border-zinc-800 py-8 text-center text-sm text-zinc-500">
      <div className="flex justify-center gap-6 pb-4">
        {SOCIAL_LINKS.map((link) => (
          <a key={link.href} href={link.href} className="hover:text-zinc-300">
            {link.label}
          </a>
        ))}
      </div>
      <p>© {new Date().getFullYear()} PHEVE</p>
    </footer>
  );
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-black text-zinc-100 antialiased">
        <Nav />
        {children}
        <Footer />
      </body>
    </html>
  );
}

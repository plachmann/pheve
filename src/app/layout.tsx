import type { Metadata } from "next";
import { Anton } from "next/font/google";
import Link from "next/link";
import type { ReactNode } from "react";
import { CartLink } from "@/components/cart-link";
import { CartProvider } from "@/components/cart-provider";
import { MobileNav } from "@/components/mobile-nav";
import "./globals.css";

const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anton",
});

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
    <header className="relative border-b-2 border-pheve-red bg-black">
      <nav className="shell flex items-center justify-between py-4">
        <Link href="/" className="font-display text-2xl uppercase tracking-widest">
          PHEVE
        </Link>
        <div className="hidden items-center gap-6 text-sm font-bold uppercase tracking-wider text-zinc-300 md:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-pheve-red">
              {link.label}
            </Link>
          ))}
          <CartLink />
        </div>
        <div className="flex items-center gap-4 text-sm font-bold uppercase tracking-wider md:hidden">
          <CartLink />
          <MobileNav links={NAV_LINKS} />
        </div>
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-24 border-t-2 border-pheve-red bg-black py-12 text-sm text-zinc-500">
      <div className="shell flex flex-col items-center gap-6">
        <div className="flex flex-wrap justify-center gap-8">
          {SOCIAL_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="font-bold uppercase tracking-wider hover:text-pheve-red"
            >
              {link.label}
            </a>
          ))}
        </div>
        <p>© {new Date().getFullYear()} PHEVE</p>
      </div>
    </footer>
  );
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={anton.variable}>
      <body className="min-h-screen bg-black text-zinc-100 antialiased">
        <CartProvider>
          <Nav />
          {children}
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}

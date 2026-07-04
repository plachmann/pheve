import Image from "next/image";
import Link from "next/link";
import { loadEvents, upcomingEvents } from "@/lib/content";

export const revalidate = 3600;

export default function HomePage() {
  const nextShow = upcomingEvents(loadEvents(), new Date())[0];

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 text-center">
      <div className="relative mx-auto h-56 w-full max-w-md">
        <Image
          src="/images/pheve-logo.png"
          alt="PHEVE"
          fill
          priority
          className="object-contain"
          sizes="(max-width: 640px) 100vw, 448px"
        />
      </div>
      <p className="mt-6 text-lg text-zinc-400">The songs you know, played loud.</p>

      <section className="mt-12">
        {nextShow ? (
          <div className="mx-auto max-w-md rounded-lg border border-zinc-800 p-6">
            <h2 className="text-sm uppercase tracking-widest text-zinc-500">Next show</h2>
            <p className="mt-2 text-xl font-bold">{nextShow.venue}</p>
            <p className="text-zinc-400">
              {nextShow.city} · {nextShow.date} · {nextShow.time}
            </p>
            <Link href="/shows" className="mt-3 inline-block text-sm underline hover:text-white">
              All shows
            </Link>
          </div>
        ) : (
          <p className="text-zinc-500">
            No shows on the books — follow us and you’ll be the first to know.
          </p>
        )}
      </section>

      <section className="mt-12 flex flex-col items-center gap-3">
        <a
          href="https://www.facebook.com/PHEVEband"
          className="w-full max-w-xs rounded-lg bg-zinc-800 py-3 font-semibold hover:bg-zinc-700"
        >
          Follow us on Facebook
        </a>
        <a
          href="https://www.instagram.com/pheveband/"
          className="w-full max-w-xs rounded-lg bg-zinc-800 py-3 font-semibold hover:bg-zinc-700"
        >
          Follow us on Instagram
        </a>
        <a
          href="https://venmo.com/pheve"
          className="w-full max-w-xs rounded-lg bg-zinc-800 py-3 font-semibold hover:bg-zinc-700"
        >
          Venmo Tips
        </a>
      </section>

      {/* mailing-list */}
    </main>
  );
}

import Image from "next/image";
import Link from "next/link";
import { MailingListForm } from "@/components/mailing-list-form";
import { loadEvents, upcomingEvents } from "@/lib/content";
import { formatEventDate } from "@/lib/dates";

export const revalidate = 3600;

const STAT_LINK =
  "mt-3 inline-block text-sm font-bold uppercase tracking-wider " +
  "text-pheve-red hover:text-white";

export default function HomePage() {
  const nextShow = upcomingEvents(loadEvents(), new Date())[0];

  return (
    <main>
      <section className="stripe-texture bg-black">
        <div className="shell grid items-center gap-10 py-16 md:grid-cols-2 md:py-28">
          <div className="clip-angled relative h-64 bg-[#111] md:order-2 md:h-96">
            <Image
              src="/images/pheve-logo.png"
              alt="PHEVE"
              fill
              priority
              className="object-contain p-8"
              sizes="(max-width: 768px) 100vw, 45vw"
            />
          </div>
          <div>
            <p className="eyebrow">Live cover band</p>
            <h1
              className={
                "headline-skew mt-3 font-display text-6xl uppercase leading-none md:text-8xl"
              }
            >
              The songs you know, played loud.
            </h1>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/shows" className="btn-primary">
                See shows
              </Link>
              <Link href="/booking" className="btn-ghost">
                Book the band
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y-2 border-pheve-red bg-[#111]">
        <div className="grid divide-y divide-zinc-800 md:grid-cols-3 md:divide-x md:divide-y-0">
          <div className="px-6 py-8 md:px-12">
            <p className="eyebrow">Next show</p>
            {nextShow ? (
              <>
                <p className="mt-2 font-display text-3xl uppercase">{nextShow.venue}</p>
                <p className="mt-1 text-zinc-400">
                  {nextShow.city} · {formatEventDate(nextShow.date)} · {nextShow.time}
                </p>
                <Link href="/shows" className={STAT_LINK}>
                  All shows →
                </Link>
              </>
            ) : (
              <p className="mt-2 text-zinc-400">
                Nothing booked — follow us and you’ll be the first to know.
              </p>
            )}
          </div>
          <div className="px-6 py-8 md:px-12">
            <p className="eyebrow">Latest merch</p>
            <p className="mt-2 font-display text-3xl uppercase">Tees, hats &amp; stickers</p>
            <Link href="/store" className={STAT_LINK}>
              Hit the store →
            </Link>
          </div>
          <div className="px-6 py-8 md:px-12">
            <p className="eyebrow">Follow</p>
            <div className="mt-2 flex flex-col gap-2 text-sm font-bold uppercase tracking-wider">
              <a href="https://www.facebook.com/PHEVEband" className="hover:text-pheve-red">
                Facebook
              </a>
              <a href="https://www.instagram.com/pheveband/" className="hover:text-pheve-red">
                Instagram
              </a>
              <a href="https://venmo.com/pheve" className="hover:text-pheve-red">
                Venmo tips
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="shell py-16 md:py-24">
        <div className="mx-auto max-w-xl text-center">
          <p className="eyebrow">Mailing list</p>
          <h2 className="headline-skew mt-2 font-display text-4xl uppercase">Never miss a show</h2>
          <MailingListForm />
        </div>
      </section>
    </main>
  );
}

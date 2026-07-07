import type { Metadata } from "next";
import { PageHeading } from "@/components/page-heading";
import { loadEvents, upcomingEvents, type BandEvent } from "@/lib/content";
import { formatEventDate } from "@/lib/dates";

export const revalidate = 3600;

export const metadata: Metadata = { title: "Shows — PHEVE" };

const VENUE_LINK_ACCENT = "text-pheve-red hover:text-white";

function EventCard({ event }: { event: BandEvent }) {
  return (
    <li className="border border-zinc-800 bg-[#111] p-6">
      <p className="eyebrow text-xs">{formatEventDate(event.date)}</p>
      <p className="mt-2 font-display text-2xl uppercase">{event.venue}</p>
      <p className="mt-1 text-zinc-400">
        {event.city} · {event.time}
      </p>
      {event.link ? (
        <a
          href={event.link}
          className={`mt-3 inline-block text-sm font-bold uppercase tracking-wider ${VENUE_LINK_ACCENT}`}
        >
          Venue info →
        </a>
      ) : null}
    </li>
  );
}

export default function ShowsPage() {
  const events = upcomingEvents(loadEvents(), new Date());

  return (
    <main className="shell py-12 md:py-16">
      <PageHeading eyebrow="On the calendar" title="Upcoming shows" />
      {events.length === 0 ? (
        <p className="mt-8 text-zinc-500">
          Nothing on the calendar right now. Follow us on socials — new dates land there first.
        </p>
      ) : (
        <ul className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard key={`${event.date}-${event.venue}`} event={event} />
          ))}
        </ul>
      )}
    </main>
  );
}

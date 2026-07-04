import type { Metadata } from "next";
import { loadEvents, upcomingEvents, type BandEvent } from "@/lib/content";

export const revalidate = 3600;

export const metadata: Metadata = { title: "Shows — PHEVE" };

function formatDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function EventCard({ event }: { event: BandEvent }) {
  return (
    <li className="rounded-lg border border-zinc-800 p-5">
      <p className="text-sm uppercase tracking-widest text-zinc-500">{formatDate(event.date)}</p>
      <p className="mt-1 text-xl font-bold">{event.venue}</p>
      <p className="text-zinc-400">
        {event.city} · {event.time}
      </p>
      {event.link ? (
        <a href={event.link} className="mt-2 inline-block text-sm underline hover:text-white">
          Venue info
        </a>
      ) : null}
    </li>
  );
}

export default function ShowsPage() {
  const events = upcomingEvents(loadEvents(), new Date());

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-black tracking-wide">Upcoming Shows</h1>
      {events.length === 0 ? (
        <p className="mt-8 text-zinc-500">
          Nothing on the calendar right now. Follow us on socials — new dates land there first.
        </p>
      ) : (
        <ul className="mt-8 space-y-4">
          {events.map((event) => (
            <EventCard key={`${event.date}-${event.venue}`} event={event} />
          ))}
        </ul>
      )}
    </main>
  );
}

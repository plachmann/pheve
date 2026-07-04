import type { Metadata } from "next";
import { BookingForm } from "@/components/booking-form";

export const metadata: Metadata = { title: "Book PHEVE" };

export default function BookingPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-black tracking-wide">Book the Band</h1>
      <p className="mt-4 text-zinc-400">
        Weddings, bars, festivals, backyard blowouts — if it has power outlets, we’ll play it. Tell
        us what you’re planning.
      </p>
      <BookingForm />
    </main>
  );
}

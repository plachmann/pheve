import type { Metadata } from "next";
import { BookingForm } from "@/components/booking-form";

export const metadata: Metadata = { title: "Book PHEVE" };

export default function BookingPage() {
  return (
    <main className="shell py-12 md:py-16">
      <div className="grid gap-12 lg:grid-cols-2">
        <section className="stripe-texture border border-zinc-800 bg-[#111] p-8 md:p-12">
          <p className="eyebrow">Booking</p>
          <h1 className="headline-skew mt-2 font-display text-5xl uppercase md:text-6xl">
            Book the band
          </h1>
          <p className="mt-6 max-w-xl text-lg text-zinc-400">
            Weddings, bars, festivals, backyard blowouts — if it has power outlets, we’ll play it.
            Tell us what you’re planning.
          </p>
        </section>
        <div className="max-w-xl">
          <BookingForm />
        </div>
      </div>
    </main>
  );
}

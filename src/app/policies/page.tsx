import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeading } from "@/components/page-heading";
import { FLAT_SHIPPING_CENTS } from "@/lib/checkout";
import { formatCents } from "@/lib/money";

export const metadata: Metadata = { title: "Store Policies — PHEVE" };

const SUPPORT_EMAIL = "merch@pheve.com";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="font-display text-3xl uppercase tracking-wide md:text-4xl">{title}</h2>
      <div className="mt-4 space-y-4 leading-relaxed text-zinc-400">{children}</div>
    </section>
  );
}

function SupportLink() {
  return (
    <a href={`mailto:${SUPPORT_EMAIL}`} className="text-zinc-100 underline hover:text-pheve-red">
      {SUPPORT_EMAIL}
    </a>
  );
}

export default function PoliciesPage() {
  return (
    <main className="shell py-12 md:py-16">
      <PageHeading eyebrow="The fine print" title="Store Policies" />

      <div className="mt-10 max-w-2xl">
        <Section title="Shipping">
          <p>
            We ship to United States addresses only. Shipping is a flat{" "}
            {formatCents(FLAT_SHIPPING_CENTS)} per order via USPS, however many items you buy.
          </p>
          <p>
            Orders leave here within 3 business days. USPS usually takes another 2–5 days after
            that. If something is going to take longer, we’ll email you.
          </p>
        </Section>

        <Section title="Returns & Refunds">
          <p>
            Unworn, unwashed merch in original condition can come back within 30 days of delivery.
            Email <SupportLink /> with your order number and we’ll confirm before you send anything.
          </p>
          <p>
            Once the item lands back with us, the refund goes to your original payment method,
            typically within 5 business days. Return shipping is on you, and the original{" "}
            {formatCents(FLAT_SHIPPING_CENTS)} shipping charge isn’t refunded.
          </p>
          <p>
            If we sent the wrong thing or it showed up damaged, that one’s on us. Email us a photo
            and we’ll cover return shipping and either replace it or refund you in full.
          </p>
        </Section>

        <Section title="Payments">
          <p>
            Payments are processed by Stripe. We never see or store your card details. Sales tax is
            calculated at checkout where required, and Stripe emails your receipt.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Order questions, returns, anything store-related: <SupportLink />. We usually reply
            within 2 business days.
          </p>
          <p>
            Want to book the band? Use the{" "}
            <Link href="/booking" className="text-zinc-100 underline hover:text-pheve-red">
              booking page
            </Link>{" "}
            instead.
          </p>
        </Section>
      </div>
    </main>
  );
}

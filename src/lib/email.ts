import { Resend } from "resend";
import type { BookingInquiry } from "@/lib/booking";
import type { CartItem } from "@/lib/cart";
import { getProduct } from "@/lib/content";

let resend: Resend | null = null;

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set — add it to .env.local / Vercel env vars`);
  return value;
}

function getResend(): Resend {
  resend ??= new Resend(requireEnv("RESEND_API_KEY"));
  return resend;
}

export async function sendBookingEmail(inquiry: BookingInquiry): Promise<void> {
  const { error } = await getResend().emails.send({
    from: requireEnv("EMAIL_FROM"),
    to: requireEnv("BAND_EMAIL"),
    replyTo: inquiry.email,
    subject: `Booking inquiry: ${inquiry.eventType} — ${inquiry.name}`,
    text: [
      `Name: ${inquiry.name}`,
      `Email: ${inquiry.email}`,
      `Date: ${inquiry.date}`,
      `Event type: ${inquiry.eventType}`,
      "",
      inquiry.message,
    ].join("\n"),
  });
  if (error) throw new Error(`Booking email failed: ${error.message}`);
}

export async function sendOrderEmail(
  sessionId: string,
  items: CartItem[],
  customerEmail: string | null,
): Promise<void> {
  const lines = items.map((item) => {
    const name = getProduct(item.slug)?.name ?? item.slug;
    return `${item.quantity} × ${name} (${item.variant})`;
  });
  const { error } = await getResend().emails.send({
    from: requireEnv("EMAIL_FROM"),
    to: requireEnv("BAND_EMAIL"),
    subject: `New merch order (${lines.length} item${lines.length === 1 ? "" : "s"})`,
    text: [
      ...lines,
      "",
      `Buyer: ${customerEmail ?? "see Stripe dashboard"}`,
      `Shipping address: Stripe dashboard → Payments → session ${sessionId}`,
    ].join("\n"),
  });
  if (error) throw new Error(`Order email failed: ${error.message}`);
}

function formatAmount(amountCents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
}

export async function sendReceiptEmail(
  customerEmail: string,
  items: CartItem[],
  amountTotalCents: number | null,
  currency: string | null,
): Promise<void> {
  const lines = items.map((item) => {
    const name = getProduct(item.slug)?.name ?? item.slug;
    return `${item.quantity} × ${name} (${item.variant})`;
  });
  const total =
    amountTotalCents !== null && currency
      ? `Total charged: ${formatAmount(amountTotalCents, currency)}`
      : "Total charged: see your card statement";
  const { error } = await getResend().emails.send({
    from: requireEnv("EMAIL_FROM"),
    to: customerEmail,
    replyTo: requireEnv("BAND_EMAIL"),
    subject: "Your PHEVE order confirmation",
    text: [
      "Thanks for your order! Here's what you bought:",
      "",
      ...lines,
      "",
      total,
      "",
      "We'll email you again when it ships. Just reply here if you have any questions.",
      "",
      "— PHEVE",
    ].join("\n"),
  });
  if (error) throw new Error(`Receipt email failed: ${error.message}`);
}

export async function addSubscriber(email: string): Promise<void> {
  const { error } = await getResend().contacts.create({
    email,
    audienceId: requireEnv("RESEND_AUDIENCE_ID"),
  });
  if (error && !error.message.toLowerCase().includes("already")) {
    throw new Error(`Subscribe failed: ${error.message}`);
  }
}

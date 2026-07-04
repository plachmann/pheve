import type Stripe from "stripe";
import { getDb } from "@/lib/db/client";
import { sendOrderEmail } from "@/lib/email";
import { getStripe } from "@/lib/stripe";
import { processCheckoutCompleted } from "@/lib/webhook";

export async function POST(request: Request): Promise<Response> {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing stripe-signature header", { status: 400 });

  let event: Stripe.Event;
  try {
    const secret = process.env["STRIPE_WEBHOOK_SECRET"];
    if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
    event = getStripe().webhooks.constructEvent(payload, signature, secret);
  } catch (err) {
    console.error("webhook signature verification failed", err);
    return new Response("Invalid signature", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    try {
      const { status, items } = await processCheckoutCompleted(
        getDb(),
        session.id,
        session.metadata?.["cart"],
      );
      if (status === "recorded") {
        try {
          await sendOrderEmail(session.id, items, session.customer_details?.email ?? null);
        } catch (emailErr) {
          // The order is recorded and visible in the Stripe dashboard. Returning 5xx here
          // would make Stripe retry and hit the duplicate path without resending the email,
          // so log loudly instead of failing the webhook.
          console.error(`order notification email failed for ${session.id}`, emailErr);
        }
      }
    } catch (err) {
      console.error(`webhook processing failed for ${session.id}`, err);
      return new Response("Processing failed", { status: 500 });
    }
  }

  return new Response("ok");
}

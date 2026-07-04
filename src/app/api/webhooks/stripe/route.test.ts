import Stripe from "stripe";
import { beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/webhooks/stripe/route";

const SECRET = "whsec_test_secret";

function signedRequest(payload: string, secret: string): Request {
  const stripe = new Stripe("sk_test_dummy");
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret });
  return new Request("http://localhost/api/webhooks/stripe", {
    method: "POST",
    headers: { "stripe-signature": signature },
    body: payload,
  });
}

beforeEach(() => {
  process.env["STRIPE_WEBHOOK_SECRET"] = SECRET;
  process.env["STRIPE_SECRET_KEY"] = "sk_test_dummy";
});

describe("POST /api/webhooks/stripe", () => {
  it("rejects a missing signature header", async () => {
    const res = await POST(
      new Request("http://localhost/api/webhooks/stripe", { method: "POST", body: "{}" }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects a payload signed with the wrong secret", async () => {
    const res = await POST(signedRequest("{}", "whsec_wrong"));
    expect(res.status).toBe(400);
  });

  it("acknowledges event types it does not handle", async () => {
    const payload = JSON.stringify({
      id: "evt_1",
      object: "event",
      type: "payment_intent.succeeded",
      data: { object: {} },
    });
    const res = await POST(signedRequest(payload, SECRET));
    expect(res.status).toBe(200);
  });
});

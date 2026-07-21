import Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CartItem } from "@/lib/cart";
import { sendOrderEmail, sendReceiptEmail } from "@/lib/email";
import { processCheckoutCompleted, UnprocessableWebhookError } from "@/lib/webhook";
import { POST } from "@/app/api/webhooks/stripe/route";

vi.mock("@/lib/db/client", () => ({
  getDb: () => ({}),
}));

vi.mock("@/lib/webhook", async () => {
  const actual = await vi.importActual<typeof import("@/lib/webhook")>("@/lib/webhook");
  return { ...actual, processCheckoutCompleted: vi.fn() };
});

vi.mock("@/lib/email", () => ({
  sendOrderEmail: vi.fn(),
  sendReceiptEmail: vi.fn(),
}));

const SECRET = "whsec_test_secret";
const SESSION_ID = "cs_test_123";
const BUYER_EMAIL = "buyer@example.com";
const AMOUNT_TOTAL = 5000;
const CURRENCY = "usd";
const items: CartItem[] = [{ slug: "logo-tee", variant: "L", quantity: 2 }];

const processMock = vi.mocked(processCheckoutCompleted);
const emailMock = vi.mocked(sendOrderEmail);
const receiptMock = vi.mocked(sendReceiptEmail);

function signedRequest(payload: string, secret: string): Request {
  const stripe = new Stripe("sk_test_dummy");
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret });
  return new Request("http://localhost/api/webhooks/stripe", {
    method: "POST",
    headers: { "stripe-signature": signature },
    body: payload,
  });
}

function checkoutPayload(customerEmail: string | null = BUYER_EMAIL): string {
  return JSON.stringify({
    id: "evt_1",
    object: "event",
    type: "checkout.session.completed",
    data: {
      object: {
        id: SESSION_ID,
        object: "checkout.session",
        metadata: { cart: '[{"s":"logo-tee","v":"L","q":2}]' },
        customer_details: customerEmail ? { email: customerEmail } : {},
        amount_total: AMOUNT_TOTAL,
        currency: CURRENCY,
      },
    },
  });
}

beforeEach(() => {
  process.env["STRIPE_WEBHOOK_SECRET"] = SECRET;
  process.env["STRIPE_SECRET_KEY"] = "sk_test_dummy";
  vi.clearAllMocks();
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

  it("returns 500 when STRIPE_WEBHOOK_SECRET is not configured", async () => {
    delete process.env["STRIPE_WEBHOOK_SECRET"];
    // A present-but-invalid signature must still surface config errors as 500, not 400.
    const res = await POST(signedRequest("{}", "whsec_wrong"));
    expect(res.status).toBe(500);
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
    expect(processMock).not.toHaveBeenCalled();
  });

  it("records the order, emails the band, and sends the buyer a receipt", async () => {
    processMock.mockResolvedValue({ status: "recorded", items });
    emailMock.mockResolvedValue();
    receiptMock.mockResolvedValue();

    const res = await POST(signedRequest(checkoutPayload(), SECRET));

    expect(res.status).toBe(200);
    expect(emailMock).toHaveBeenCalledTimes(1);
    expect(emailMock).toHaveBeenCalledWith(SESSION_ID, items, BUYER_EMAIL);
    expect(receiptMock).toHaveBeenCalledTimes(1);
    expect(receiptMock).toHaveBeenCalledWith(BUYER_EMAIL, items, AMOUNT_TOTAL, CURRENCY);
  });

  it("does not email anyone on a duplicate (already-recorded) checkout", async () => {
    processMock.mockResolvedValue({ status: "duplicate", items });

    const res = await POST(signedRequest(checkoutPayload(), SECRET));

    expect(res.status).toBe(200);
    expect(emailMock).not.toHaveBeenCalled();
    expect(receiptMock).not.toHaveBeenCalled();
  });

  it("skips the buyer receipt when the session has no customer email", async () => {
    processMock.mockResolvedValue({ status: "recorded", items });
    emailMock.mockResolvedValue();

    const res = await POST(signedRequest(checkoutPayload(null), SECRET));

    expect(res.status).toBe(200);
    expect(emailMock).toHaveBeenCalledWith(SESSION_ID, items, null);
    expect(receiptMock).not.toHaveBeenCalled();
  });

  it("still returns 200 when the order email fails to send", async () => {
    processMock.mockResolvedValue({ status: "recorded", items });
    emailMock.mockRejectedValue(new Error("resend down"));
    receiptMock.mockResolvedValue();

    const res = await POST(signedRequest(checkoutPayload(), SECRET));

    expect(res.status).toBe(200);
    expect(emailMock).toHaveBeenCalledTimes(1);
    expect(receiptMock).toHaveBeenCalledTimes(1);
  });

  it("still returns 200 when the buyer receipt fails to send", async () => {
    processMock.mockResolvedValue({ status: "recorded", items });
    emailMock.mockResolvedValue();
    receiptMock.mockRejectedValue(new Error("resend down"));

    const res = await POST(signedRequest(checkoutPayload(), SECRET));

    expect(res.status).toBe(200);
    expect(receiptMock).toHaveBeenCalledTimes(1);
  });

  it("returns 200 for an unprocessable event so Stripe stops retrying", async () => {
    processMock.mockRejectedValue(new UnprocessableWebhookError("missing metadata"));

    const res = await POST(signedRequest(checkoutPayload(), SECRET));

    expect(res.status).toBe(200);
    expect(emailMock).not.toHaveBeenCalled();
    expect(receiptMock).not.toHaveBeenCalled();
  });

  it("returns 500 on a transient processing failure so Stripe retries", async () => {
    processMock.mockRejectedValue(new Error("db down"));

    const res = await POST(signedRequest(checkoutPayload(), SECRET));

    expect(res.status).toBe(500);
    expect(emailMock).not.toHaveBeenCalled();
    expect(receiptMock).not.toHaveBeenCalled();
  });
});

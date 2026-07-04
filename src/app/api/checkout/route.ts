import { checkoutRequestSchema, createCheckoutSession } from "@/lib/checkout";
import { getDb } from "@/lib/db/client";
import { getStripe } from "@/lib/stripe";

export async function POST(request: Request): Promise<Response> {
  const body = await request.json().catch(() => null);
  const parsed = checkoutRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid cart contents" }, { status: 400 });
  }

  const origin = new URL(request.url).origin;
  const result = await createCheckoutSession(getDb(), getStripe(), parsed.data.items, origin);
  if (!result.ok) {
    return Response.json(
      { error: result.error, issues: result.issues ?? [] },
      { status: result.status },
    );
  }
  return Response.json({ url: result.url });
}

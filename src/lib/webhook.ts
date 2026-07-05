import { parseCartMetadata, type CartItem } from "@/lib/cart";
import type { Db } from "@/lib/db/client";
import { recordOrderAndDecrement } from "@/lib/inventory";

/**
 * Raised when a webhook event can never succeed, no matter how many times it is
 * retried (missing or malformed cart metadata). The route maps this to a 200 so
 * Stripe stops redelivering it, unlike transient failures which return 5xx.
 */
export class UnprocessableWebhookError extends Error {}

export async function processCheckoutCompleted(
  db: Db,
  sessionId: string,
  cartMetadata: string | undefined,
): Promise<{ status: "recorded" | "duplicate"; items: CartItem[] }> {
  if (!cartMetadata) {
    throw new UnprocessableWebhookError(
      `Session ${sessionId} has no cart metadata — was it created by this site?`,
    );
  }
  let items: CartItem[];
  try {
    items = parseCartMetadata(cartMetadata);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new UnprocessableWebhookError(
      `Session ${sessionId} has malformed cart metadata: ${reason}`,
    );
  }
  const status = await recordOrderAndDecrement(db, sessionId, items);
  return { status, items };
}

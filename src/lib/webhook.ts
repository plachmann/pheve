import { parseCartMetadata, type CartItem } from "@/lib/cart";
import type { Db } from "@/lib/db/client";
import { recordOrderAndDecrement } from "@/lib/inventory";

export async function processCheckoutCompleted(
  db: Db,
  sessionId: string,
  cartMetadata: string | undefined,
): Promise<{ status: "recorded" | "duplicate"; items: CartItem[] }> {
  if (!cartMetadata) {
    throw new Error(`Session ${sessionId} has no cart metadata — was it created by this site?`);
  }
  const items = parseCartMetadata(cartMetadata);
  const status = await recordOrderAndDecrement(db, sessionId, items);
  return { status, items };
}

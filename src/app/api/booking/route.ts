import { z } from "zod";
import { bookingSchema } from "@/lib/booking";
import { getDb } from "@/lib/db/client";
import { sendBookingEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";

const honeypotSchema = z.object({ website: z.string().optional() }).loose();

export async function POST(request: Request): Promise<Response> {
  const body = await request.json().catch(() => null);

  // Honeypot: bots fill every field. Pretend success, send nothing.
  const honeypot = honeypotSchema.safeParse(body);
  if (honeypot.success && honeypot.data.website) {
    return Response.json({ ok: true });
  }

  const parsed = bookingSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Please fill in every field with valid values" },
      { status: 400 },
    );
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const allowed = await checkRateLimit(getDb(), `booking:${ip}`, 5, 3600);
  if (!allowed) {
    return Response.json({ error: "Too many requests — try again in an hour" }, { status: 429 });
  }

  await sendBookingEmail(parsed.data);
  return Response.json({ ok: true });
}

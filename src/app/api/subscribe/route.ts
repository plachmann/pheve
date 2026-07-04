import { z } from "zod";
import { addSubscriber } from "@/lib/email";

const subscribeSchema = z.object({ email: z.email() });

export async function POST(request: Request): Promise<Response> {
  const body = await request.json().catch(() => null);
  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Enter a valid email address" }, { status: 400 });
  }
  await addSubscriber(parsed.data.email);
  return Response.json({ ok: true });
}

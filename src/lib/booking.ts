import { z } from "zod";

export const bookingSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.email(),
  date: z.string().trim().min(1).max(200),
  eventType: z.string().trim().min(1).max(100),
  message: z.string().trim().min(1).max(5000),
});
export type BookingInquiry = z.infer<typeof bookingSchema>;

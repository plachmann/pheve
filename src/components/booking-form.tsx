"use client";

import { useState, type FormEvent } from "react";

const inputClass = "input-field mt-1";

export function BookingForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    const formData = new FormData(e.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setStatus("sent");
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setErrorMessage(data.error ?? "Something went wrong — try again.");
      setStatus("error");
    } catch {
      setErrorMessage("Something went wrong — try again.");
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <p className="mt-8 border border-green-900 bg-green-950/40 p-6 text-green-200">
        Got it — we’ll get back to you within a couple of days. 🤘
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 lg:mt-2">
      <label className="block">
        <span className="text-sm uppercase tracking-widest text-zinc-500">Your name</span>
        <input name="name" required maxLength={200} className={inputClass} />
      </label>
      <label className="block">
        <span className="text-sm uppercase tracking-widest text-zinc-500">Email</span>
        <input name="email" type="email" required className={inputClass} />
      </label>
      <label className="block">
        <span className="text-sm uppercase tracking-widest text-zinc-500">
          Event date (rough is fine)
        </span>
        <input
          name="date"
          required
          maxLength={200}
          placeholder="e.g. Saturday, Oct 10"
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="text-sm uppercase tracking-widest text-zinc-500">Event type</span>
        <input
          name="eventType"
          required
          maxLength={100}
          placeholder="Wedding, bar, private party…"
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="text-sm uppercase tracking-widest text-zinc-500">Tell us about it</span>
        <textarea name="message" required maxLength={5000} rows={5} className={inputClass} />
      </label>
      {/* Honeypot — hidden from humans, irresistible to bots */}
      <input
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />
      <button type="submit" disabled={status === "sending"} className="btn-primary">
        {status === "sending" ? "Sending…" : "Send inquiry"}
      </button>
      {status === "error" ? <p className="text-red-400">{errorMessage}</p> : null}
    </form>
  );
}

"use client";

import { useState, type FormEvent } from "react";

export function MailingListForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    const email = new FormData(e.currentTarget).get("email");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return <p className="mt-8 text-green-300">You’re on the list. See you up front. 🤘</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-2 sm:flex-row">
      <label className="sr-only" htmlFor="mailing-list-email">
        Email address
      </label>
      <input
        id="mailing-list-email"
        name="email"
        type="email"
        required
        placeholder="you@example.com"
        className="input-field"
      />
      <button
        type="submit"
        disabled={status === "sending"}
        className="btn-primary whitespace-nowrap"
      >
        Get show alerts
      </button>
      {status === "error" ? <p className="text-sm text-red-400">Try again?</p> : null}
    </form>
  );
}

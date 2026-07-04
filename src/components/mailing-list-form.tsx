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
    return <p className="mt-12 text-green-300">You’re on the list. See you up front. 🤘</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto mt-12 flex max-w-md gap-2">
      <label className="sr-only" htmlFor="mailing-list-email">
        Email address
      </label>
      <input
        id="mailing-list-email"
        name="email"
        type="email"
        required
        placeholder="you@example.com"
        className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 focus:border-zinc-500 focus:outline-none"
      />
      <button
        type="submit"
        disabled={status === "sending"}
        className="whitespace-nowrap rounded bg-white px-4 py-2 font-bold text-black hover:bg-zinc-200 disabled:opacity-50"
      >
        Get show alerts
      </button>
      {status === "error" ? <p className="text-sm text-red-400">Try again?</p> : null}
    </form>
  );
}

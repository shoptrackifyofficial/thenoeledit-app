"use client";

import { useActionState } from "react";

import { subscribe, type NewsletterState } from "@/app/actions/newsletter";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

export function NewsletterForm({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const [state, action, pending] = useActionState<NewsletterState, FormData>(subscribe, {
    status: "idle",
    message: "",
  });

  if (state.status === "ok") {
    return (
      <p role="status" className="flex items-center gap-3 rounded-full bg-gold-500/15 px-5 py-4 text-[0.95rem]">
        <Icon name="sparkle" className="size-5 text-gold-400" /> {state.message}
      </p>
    );
  }

  return (
    <form action={action} className="w-full">
      <div
        className={cn(
          "flex items-center gap-2 rounded-full p-1.5 ring-1",
          tone === "dark" ? "bg-snow/8 ring-snow/25 focus-within:ring-gold-400" : "bg-snow ring-line focus-within:ring-ink",
        )}
      >
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <input
          id="newsletter-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="Your email address"
          className={cn(
            "min-w-0 flex-1 bg-transparent px-4 py-2.5 text-[0.95rem] outline-none",
            tone === "dark" ? "placeholder:text-snow/50" : "placeholder:text-ink-faint",
          )}
        />
        <input type="text" name="company" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
        <button type="submit" disabled={pending} className="btn btn-gold min-h-11 px-5 text-[0.72rem]">
          {pending ? <Icon name="spinner" className="size-4 animate-spin" /> : "Join"}
        </button>
      </div>
      {state.status === "error" && (
        <p role="alert" className="mt-2 pl-4 text-[0.82rem] text-berry-500">
          {state.message}
        </p>
      )}
    </form>
  );
}

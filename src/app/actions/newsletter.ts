"use server";

import { adminRequest } from "@/lib/shopify/admin";
import { isAdminConfigured } from "@/lib/shopify/config";

/**
 * Newsletter sign-up → a Shopify customer subscribed to email marketing
 * (Admin API `customerCreate`, needs the `write_customers` scope). An address
 * that already exists is treated as success — we never reveal whether an
 * email is on file.
 */

export type NewsletterState = { status: "idle" | "ok" | "error"; message: string };

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;

const CUSTOMER_CREATE = `
mutation Subscribe($input: CustomerInput!) {
  customerCreate(input: $input) {
    customer { id }
    userErrors { field message }
  }
}`;

export async function subscribe(_prev: NewsletterState, form: FormData): Promise<NewsletterState> {
  // Honeypot: real people never fill the hidden field.
  if (String(form.get("company") ?? "").length > 0) return { status: "ok", message: "You're on the list." };

  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL.test(email)) return { status: "error", message: "Please enter a valid email address." };
  if (!isAdminConfigured()) return { status: "error", message: "Sign-up is unavailable right now — please try again later." };

  try {
    const data = await adminRequest<{
      customerCreate: { customer: { id: string } | null; userErrors: { message: string }[] };
    }>(
      CUSTOMER_CREATE,
      {
        input: {
          email,
          tags: ["noel-edit", "newsletter"],
          emailMarketingConsent: { marketingState: "SUBSCRIBED", marketingOptInLevel: "SINGLE_OPT_IN" },
        },
      },
      { retries: 0 },
    );
    const err = data.customerCreate.userErrors[0]?.message ?? "";
    if (!data.customerCreate.customer && !/taken|exists/i.test(err)) {
      console.error("[newsletter] customerCreate:", err);
      return { status: "error", message: "We couldn't sign you up just now. Please try again." };
    }
    return { status: "ok", message: "You're on the list — watch your inbox for early access." };
  } catch (error) {
    console.error("[newsletter]", error instanceof Error ? error.message : error);
    return { status: "error", message: "We couldn't sign you up just now. Please try again." };
  }
}

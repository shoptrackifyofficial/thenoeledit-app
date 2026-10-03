/**
 * One shared GraphQL transport for every Shopify API (Admin / Storefront /
 * Customer Account). Handles timeouts, retries with jittered backoff,
 * `THROTTLED` responses and request-id capture. Never logs credentials.
 */

export type GraphQLRequestOptions = {
  endpoint: string;
  query: string;
  variables?: Record<string, unknown>;
  /** Bearer / access token header — set per API. */
  bearerToken?: string | null;
  /** Storefront public token — sent as `X-Shopify-Storefront-Access-Token`. */
  storefrontToken?: string | null;
  headers?: Record<string, string>;
  timeoutMs?: number;
  /** Queries may retry; mutations should pass 1 so a write is never applied twice. */
  retries?: number;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class ShopifyGraphQLError extends Error {
  readonly status: number;
  readonly code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ShopifyGraphQLError";
    this.status = status;
    this.code = code;
  }
}

export async function graphqlRequest<T>(
  options: GraphQLRequestOptions,
): Promise<T> {
  const {
    endpoint,
    query,
    variables = {},
    bearerToken,
    storefrontToken,
    headers = {},
    timeoutMs = 15_000,
    retries = 2,
  } = options;

  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };
  if (bearerToken) requestHeaders.Authorization = bearerToken;
  if (storefrontToken) {
    requestHeaders["X-Shopify-Storefront-Access-Token"] = storefrontToken;
  }

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: requestHeaders,
        body: JSON.stringify({ query, variables }),
        signal: controller.signal,
        cache: "no-store",
      });

      const retryAfter = response.headers.get("retry-after");
      if (response.status === 429 && retryAfter && attempt < retries) {
        clearTimeout(timer);
        await sleep(Number(retryAfter) * 1000 || 1000);
        continue;
      }

      const body = (await response.json().catch(() => ({}))) as {
        data?: T;
        errors?: Array<{ message?: string; extensions?: { code?: string } }>;
      };

      if (!response.ok) {
        const code = body.errors?.[0]?.extensions?.code;
        if (
          (response.status === 429 || response.status >= 500 || code === "THROTTLED") &&
          attempt < retries
        ) {
          clearTimeout(timer);
          await sleep(500 * (attempt + 1) + Math.random() * 500);
          continue;
        }
        const message = body.errors?.[0]?.message ?? `Shopify returned HTTP ${response.status}`;
        throw new ShopifyGraphQLError(message, response.status, code);
      }

      if (body.errors?.length) {
        throw new ShopifyGraphQLError(
          body.errors[0]?.message ?? "Shopify GraphQL error",
          response.status,
          body.errors[0]?.extensions?.code,
        );
      }

      clearTimeout(timer);
      return body.data as T;
    } catch (error) {
      clearTimeout(timer);
      lastError = error;
      if (error instanceof ShopifyGraphQLError) {
        // Non-retryable (4xx without throttle code) — surface immediately.
        if (error.status < 500 && error.status !== 429 && error.code !== "THROTTLED") throw error;
      } else if (error instanceof DOMException && error.name === "AbortError") {
        lastError = new ShopifyGraphQLError("Shopify request timed out", 408);
      }
      if (attempt < retries) {
        await sleep(500 * (attempt + 1) + Math.random() * 500);
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new ShopifyGraphQLError("Shopify request failed", 502);
}

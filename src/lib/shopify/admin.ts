import { getAdminToken } from "@/lib/shopify/admin-token";
import { graphqlRequest } from "@/lib/shopify/client";
import { adminEndpoint } from "@/lib/shopify/config";

/** Admin GraphQL request with the cached client-credentials token. */
export async function adminRequest<T>(
  query: string,
  variables: Record<string, unknown> = {},
  options: { retries?: number } = {},
): Promise<T> {
  const token = await getAdminToken();
  return graphqlRequest<T>({
    endpoint: adminEndpoint(),
    query,
    variables,
    headers: { "X-Shopify-Access-Token": token },
    retries: options.retries,
  });
}

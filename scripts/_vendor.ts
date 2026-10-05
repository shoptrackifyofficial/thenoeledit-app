import { adminRequest } from "../src/lib/shopify/admin";
import { writeFileSync } from "node:fs";
async function main() {
  const out: any[] = [];
  let after: string | null = null;
  for (;;) {
    const d: any = await adminRequest(`query($after:String){ products(first:50, after:$after, query:"vendor:TheNoelEdit"){ pageInfo{hasNextPage endCursor} nodes{ id handle title vendor status tags productType descriptionHtml
      options{name values} variants(first:100){ nodes{ id title price compareAtPrice inventoryQuantity selectedOptions{name value} image{url} } }
      media(first:60){ nodes{ mediaContentType ... on MediaImage{ image{url width height} } } }
      metafields(first:30, namespace:"custom"){ nodes{ key value } }
      resourcePublicationsV2(first:30){ nodes{ isPublished publication{ name } } } } } }`, { after });
    out.push(...d.products.nodes);
    if (!d.products.pageInfo.hasNextPage) break;
    after = d.products.pageInfo.endCursor;
  }
  writeFileSync(process.env.OUT!, JSON.stringify(out));
  for (const p of out) console.log(p.id.split("/").pop(), p.status, p.tags.includes("noel-edit") ? "IMPORTED" : "new     ", String(p.variants.nodes.length).padStart(2), "v", p.variants.nodes[0].price, "|", p.title.slice(0, 70));
  console.log(out.length, "products");
}
main().catch((e) => console.error(e.message));

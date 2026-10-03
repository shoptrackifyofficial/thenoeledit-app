import Image from "next/image";
import Link from "next/link";

import { BagButton, DesktopNav, HeaderShell, MobileMenu } from "@/components/layout/HeaderClient";
import { Icon } from "@/components/ui/Icon";
import { site } from "@/content/site";
import { getMenuData } from "@/lib/commerce/views";
import { customerAccountUrl } from "@/lib/shopify/config";

function Announcement() {
  const cutoff = new Date(`${site.deliveryCutoffs[0]!.date}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  return (
    <div className="bg-pine-900 text-pine-100">
      <p className="container-page flex h-(--announce-h) items-center justify-center gap-3 text-center text-[0.74rem] font-medium tracking-[0.08em]">
        <Icon name="snowflake" className="size-3.5 shrink-0 text-gold-400" />
        <span>
          <strong className="font-bold text-snow">{site.sale.headline}</strong> · Free gift wrap
          <span className="hidden sm:inline"> · Order by {cutoff} for Christmas delivery</span>
        </span>
      </p>
    </div>
  );
}

/** Site header: logo centred, Shop → Category → Products menu, search, account, bag. */
export async function Header() {
  const menu = await getMenuData();
  const accountUrl = customerAccountUrl();

  return (
    <HeaderShell announcement={<Announcement />}>
      <div className="flex h-full items-center">
        <MobileMenu menu={menu} accountUrl={accountUrl} />
        <DesktopNav menu={menu} />
      </div>

      <Link href="/" aria-label={`${site.name} — home`} className="justify-self-center transition-transform duration-500 ease-out-soft hover:scale-105">
        <Image
          src="/logo-200.webp"
          alt={site.name}
          width={200}
          height={200}
          priority
          sizes="72px"
          className="size-14 drop-shadow-[0_2px_10px_rgb(0_0_0/0.35)] sm:size-16 lg:size-[4.5rem]"
        />
      </Link>

      <div className="flex items-center justify-end">
        <Link
          href="/search"
          className="grid size-11 place-items-center rounded-full transition-colors hover:bg-current/8"
          aria-label="Search gifts"
        >
          <Icon name="search" />
        </Link>
        {accountUrl && (
          <a
            href={accountUrl}
            className="hidden size-11 place-items-center rounded-full transition-colors hover:bg-current/8 lg:grid"
            aria-label="Your account"
          >
            <Icon name="user" />
          </a>
        )}
        <BagButton />
      </div>
    </HeaderShell>
  );
}

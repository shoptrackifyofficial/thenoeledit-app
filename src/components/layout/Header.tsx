import Image from "next/image";
import Link from "next/link";

import { BagButton, DesktopNav, HeaderShell, MobileMenu } from "@/components/layout/HeaderClient";
import { Icon } from "@/components/ui/Icon";
import { site } from "@/content/site";
import { getMenuData } from "@/lib/commerce/views";
import { customerAccountUrl } from "@/lib/shopify/config";

function Announcement() {
  return (
    <div className="bg-berry-600 text-snow">
      <p className="container-page flex h-(--announce-h) items-center justify-center gap-2.5 text-center text-[0.74rem] font-medium">
        <Icon name="sparkle" className="size-3.5 shrink-0 animate-twinkle text-gold-300" />
        <span>
          <strong className="font-bold">{site.sale.headline}</strong>
          <span className="opacity-60"> · </span>Free shipping on every order
          <span className="hidden sm:inline">
            <span className="opacity-60"> · </span>Shop early for a stress-free Christmas
          </span>
        </span>
        <Icon name="sparkle" className="size-3.5 shrink-0 animate-twinkle text-gold-300 [animation-delay:1.6s]" />
      </p>
    </div>
  );
}

/** Site header: floating pill, logo badge centred, Shop → Category → Products menu, search, account, bag. */
export async function Header() {
  const menu = await getMenuData();
  const accountUrl = customerAccountUrl();

  return (
    <HeaderShell announcement={<Announcement />}>
      <div className="flex h-full items-center">
        <MobileMenu menu={menu} accountUrl={accountUrl} />
        <DesktopNav menu={menu} />
      </div>

      <Link
        href="/"
        aria-label={`${site.name} — home`}
        className="header-logo grid place-items-center justify-self-center rounded-full p-0.5 transition-[transform,background-color,box-shadow] duration-500 ease-out-soft hover:rotate-[-6deg] group-data-[over-hero=true]/header:bg-snow group-data-[over-hero=true]/header:shadow-[0_6px_20px_-6px_rgb(0_0_0/0.6)]"
      >
        <Image
          src="/logo-200.webp"
          alt={site.name}
          width={200}
          height={200}
          priority
          sizes="52px"
          className="size-11 lg:size-[3.25rem]"
        />
      </Link>

      <div className="flex items-center justify-end gap-0.5">
        <Link
          href="/search"
          className="hidden size-11 place-items-center rounded-full transition-colors hover:bg-berry-50 sm:grid"
          aria-label="Search gifts"
        >
          <Icon name="search" />
        </Link>
        {accountUrl && (
          <a
            href={accountUrl}
            className="hidden size-11 place-items-center rounded-full transition-colors hover:bg-berry-50 lg:grid"
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

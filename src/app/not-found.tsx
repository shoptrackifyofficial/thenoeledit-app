import Image from "next/image";
import Link from "next/link";

import { Icon } from "@/components/ui/Icon";

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[64vh] flex-col items-center justify-center py-20 text-center">
      <Image src="/logo-200.webp" alt="" width={200} height={200} className="mb-5 size-24 animate-float [--r:-6deg]" />
      <p className="kicker mb-3">Oh, snow!</p>
      <h1 className="display-lg">
        This page slipped <span className="accent text-berry-600">off the sleigh</span>
      </h1>
      <p className="mt-4 max-w-md text-ink-soft">
        The link may be old, or the gift has sold out for the season. The rest of the sale is still here.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/shop" className="btn btn-primary shine">
          Shop the sale <Icon name="arrow-right" className="size-4" />
        </Link>
        <Link href="/search" className="btn btn-outline">
          Search gifts
        </Link>
      </div>
    </div>
  );
}

import type { Metadata } from "next";

import { BagContents } from "@/components/cart/BagContents";

export const metadata: Metadata = {
  title: "Your bag",
  robots: { index: false, follow: true },
  alternates: { canonical: "/cart" },
};

export default function CartPage() {
  return (
    <div className="container-page py-10 lg:py-16">
      <p className="script text-[2.4rem] text-berry-600" aria-hidden="true">
        nearly wrapped
      </p>
      <h1 className="display-lg -mt-1">Your bag</h1>
      <div className="mt-8 flex flex-col">
        <BagContents variant="page" />
      </div>
    </div>
  );
}

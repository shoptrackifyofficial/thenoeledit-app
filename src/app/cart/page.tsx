import type { Metadata } from "next";

import { BagContents } from "@/components/cart/BagContents";

export const metadata: Metadata = {
  title: "Your bag",
  robots: { index: false, follow: true },
  alternates: { canonical: "/cart" },
};

export default function CartPage() {
  return (
    <div className="container-page py-8 lg:py-12">
      <p className="kicker mb-3">Nearly there</p>
      <h1 className="display-lg">
        Your <span className="accent text-berry-600">bag</span>
      </h1>
      <div className="mt-6 flex flex-col">
        <BagContents variant="page" />
      </div>
    </div>
  );
}

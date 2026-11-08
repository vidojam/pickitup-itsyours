"use client";

import { usePathname } from "next/navigation";
import { TermsBox } from "@/components/TermsBox";

export function Footer() {
  const pathname = usePathname();

  // Item detail pages already show the terms inside the unlock flow.
  if (/^\/items\/[^/]+$/.test(pathname)) {
    return null;
  }

  return (
    <footer className="mx-auto mt-12 w-full max-w-6xl px-4 pb-10 sm:px-6 lg:px-8">
      <TermsBox />
    </footer>
  );
}

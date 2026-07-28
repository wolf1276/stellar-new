"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/proposals", label: "Proposals" },
  { href: "/wallet", label: "Wallet" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="nav">
      <Link href="/" className="nav-brand">
        ⬟ Stellar Vote
      </Link>
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={cn(pathname.startsWith(l.href) && "text-[var(--color-accent)] font-medium")}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

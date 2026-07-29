"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useWallet } from "@/hooks/useWallet";
import { Button } from "@/components/ui/button";

const links = [{ href: "/proposals", label: "Proposals" }];

function truncate(address: string) {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export default function Nav() {
  const pathname = usePathname();
  const { wallet, connecting, connect, disconnect } = useWallet();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (pathname === "/") return null;

  return (
    <nav className={cn("nav", scrolled && "nav-scrolled")}>
      <Link href="/" className="nav-brand flex items-center gap-2">
        <Image src="/logo.png" alt="" width={24} height={24} priority />
        Altair
      </Link>
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={cn("nav-link", pathname.startsWith(l.href) && "nav-link-active")}
        >
          {l.label}
        </Link>
      ))}
      {wallet ? (
        <div className="flex items-center gap-2">
          <span className="addr">{truncate(wallet.address)}</span>
          <Button variant="outline" onClick={disconnect}>
            Disconnect
          </Button>
        </div>
      ) : (
        <Button onClick={connect} disabled={connecting} aria-busy={connecting}>
          {connecting ? "Connecting..." : "Connect Wallet"}
        </Button>
      )}
    </nav>
  );
}

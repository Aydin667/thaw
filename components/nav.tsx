"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { WalletButton } from "./wallet-button";

const links = [
  { href: "/launch", label: "launch" },
  { href: "/launches", label: "launches" },
  { href: "/how", label: "how it works" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <Image
            src="/favicon-32.png"
            alt=""
            width={24}
            height={24}
            className="pixelated"
          />
          <span className="font-pixel text-sm tracking-wide">
            SLOT<span className="text-green">ZERO</span>
          </span>
        </Link>
        <nav className="hidden sm:flex items-center gap-1 font-mono text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-1.5 rounded-sm transition-colors ${
                pathname === l.href
                  ? "text-green"
                  : "text-muted hover:text-text"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <WalletButton />
        </div>
      </div>
      {/* mobile nav row */}
      <nav className="sm:hidden flex items-center gap-1 font-mono text-xs px-4 pb-2 -mt-1">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`px-2.5 py-1 rounded-sm ${
              pathname === l.href ? "text-green" : "text-muted"
            }`}
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

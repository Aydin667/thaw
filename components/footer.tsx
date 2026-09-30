import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-line mt-24">
      <div className="mx-auto max-w-6xl px-4 py-10 grid gap-8 sm:grid-cols-3">
        <div>
          <div className="font-pixel text-sm mb-3">
            TH<span className="text-green">AW</span>
          </div>
          <p className="text-sm text-muted leading-relaxed max-w-xs">
            Pump.fun launches where the dev bag is capped and melts on a public schedule from second zero.
            Not affiliated with Pump.fun — tokens are created on Pump.fun&apos;s
            own on-chain program.
          </p>
        </div>
        <div className="font-mono text-sm">
          <div className="text-[11px] uppercase tracking-wider text-muted mb-3">
            product
          </div>
          <ul className="space-y-2">
            <li><Link href="/launch" className="text-muted hover:text-green transition-colors">launch a token</Link></li>
            <li><Link href="/launches" className="text-muted hover:text-green transition-colors">thaw launches</Link></li>
            <li><Link href="/how" className="text-muted hover:text-green transition-colors">how it works</Link></li>
            <li><a href="/api/verify/So11111111111111111111111111111111111111112" className="text-muted hover:text-green transition-colors">verifier API</a></li>
          </ul>
        </div>
        <div className="font-mono text-sm">
          <div className="text-[11px] uppercase tracking-wider text-muted mb-3">
            elsewhere
          </div>
          <ul className="space-y-2">
            <li><a href="https://x.com/thawlol" target="_blank" rel="noopener noreferrer" className="text-muted hover:text-green transition-colors">x / twitter</a></li>
            <li><a href="https://pump.fun" target="_blank" rel="noopener noreferrer" className="text-muted hover:text-green transition-colors">pump.fun</a></li>
            <li><a href="https://lock.jup.ag" target="_blank" rel="noopener noreferrer" className="text-muted hover:text-green transition-colors">jupiter lock</a></li>
            <li><Link href="/terms" className="text-muted hover:text-green transition-colors">terms</Link></li>
            <li><Link href="/privacy" className="text-muted hover:text-green transition-colors">privacy</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto max-w-6xl px-4 py-4 font-mono text-xs text-muted flex flex-wrap gap-2 justify-between">
          <span>© {new Date().getFullYear()} thawlaunch.lol</span>
          <span>
            memecoins are extremely risky. a public melt schedule is not investment
            advice.
          </span>
        </div>
      </div>
    </footer>
  );
}

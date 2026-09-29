import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-32 text-center">
      <div className="font-pixel text-4xl mb-4 text-green">404</div>
      <p className="font-mono text-sm text-muted mb-8">
        this slot is empty.
      </p>
      <Link
        href="/"
        className="font-mono text-sm border border-line px-5 py-2.5 rounded-sm hover:border-green-dim transition-colors"
      >
        ← back home
      </Link>
    </div>
  );
}

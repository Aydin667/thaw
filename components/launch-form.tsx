"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { VersionedTransaction } from "@solana/web3.js";
import {
  MAX_DEV_BUY_SOL,
  MIN_DEV_BUY_SOL,
  SEAL_PRESETS,
} from "@/lib/config";
import type {
  ApiError,
  PrepareResponse,
  StatusResponse,
} from "@/lib/types";
import { fmtSol, fmtDate, fmtTokensRaw } from "@/lib/format";
import { WalletButton } from "./wallet-button";

type Phase =
  | { k: "form" }
  | { k: "preparing" }
  | { k: "review"; prep: PrepareResponse }
  | { k: "signing"; prep: PrepareResponse }
  | { k: "submitting"; prep: PrepareResponse }
  | { k: "pending"; prep: PrepareResponse; bundleId: string }
  | { k: "landed"; prep: PrepareResponse; slot?: number; simulated?: boolean }
  | { k: "expired"; prep: PrepareResponse };

interface FormState {
  name: string;
  symbol: string;
  description: string;
  website: string;
  twitter: string;
  telegram: string;
  devBuySol: string;
  presetId: string;
  cliffDays: string;
  linearDays: string;
}

const initialForm: FormState = {
  name: "",
  symbol: "",
  description: "",
  website: "",
  twitter: "",
  telegram: "",
  devBuySol: "1",
  presetId: "steady",
  cliffDays: "0",
  linearDays: "45",
};

export function LaunchForm() {
  const { publicKey: walletKey, signAllTransactions } = useWallet();
  // Dev-only visual preview of the form without a wallet (?preview=1).
  // Set after mount so server and client render identically (no hydration diff).
  const [previewKey, setPreviewKey] = useState<{ toBase58(): string } | null>(null);
  useEffect(() => {
    if (
      process.env.NODE_ENV === "development" &&
      new URLSearchParams(window.location.search).get("preview") === "1"
    ) {
      setPreviewKey({
        toBase58: () => "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
      });
    }
  }, []);
  const publicKey = walletKey ?? (previewKey as never);
  const [form, setForm] = useState<FormState>(initialForm);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>({ k: "form" });
  const [advanced, setAdvanced] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const set = (patch: Partial<FormState>) =>
    setForm((f) => ({ ...f, ...patch }));

  const preset = SEAL_PRESETS.find((p) => p.id === form.presetId);
  // Thaw never has a cliff.
  const cliffDays = 0;
  const linearDays = preset ? preset.linearDays : Number(form.linearDays) || 0;

  const onImage = useCallback((file: File | null) => {
    setImage(file);
    setImagePreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return file ? URL.createObjectURL(file) : null;
    });
  }, []);

  const clientValidate = (): string | null => {
    if (!publicKey) return "Connect a wallet first.";
    if (!form.name.trim()) return "Token name is required.";
    if (form.name.trim().length > 32) return "Token name: max 32 characters.";
    if (!/^[A-Za-z0-9]{1,10}$/.test(form.symbol.trim()))
      return "Ticker: 1–10 letters/numbers.";
    if (!image) return "Token image is required.";
    const buy = Number(form.devBuySol);
    if (!(buy >= MIN_DEV_BUY_SOL && buy <= MAX_DEV_BUY_SOL))
      return `Dev buy must be between ${MIN_DEV_BUY_SOL} and ${MAX_DEV_BUY_SOL} SOL.`;
    if (linearDays < 3) return "Thaw duration must be at least 3 days.";
    for (const [label, v] of [
      ["Website", form.website],
      ["X link", form.twitter],
      ["Telegram", form.telegram],
    ] as const) {
      if (v && !/^https:\/\/.+/.test(v.trim()))
        return `${label} must be an https:// URL.`;
    }
    return null;
  };

  const prepare = async () => {
    const err = clientValidate();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setPhase({ k: "preparing" });
    try {
      const fd = new FormData();
      fd.set("name", form.name.trim());
      fd.set("symbol", form.symbol.trim().toUpperCase());
      fd.set("description", form.description.trim());
      fd.set("website", form.website.trim());
      fd.set("twitter", form.twitter.trim());
      fd.set("telegram", form.telegram.trim());
      fd.set("devBuySol", String(Number(form.devBuySol)));
      fd.set("cliffDays", String(cliffDays));
      fd.set("linearDays", String(linearDays));
      fd.set("creator", publicKey!.toBase58());
      fd.set("image", image!);
      const res = await fetch("/api/launch/prepare", {
        method: "POST",
        body: fd,
      });
      const json = (await res.json()) as PrepareResponse | ApiError;
      if ("error" in json) {
        setError(json.error.message);
        setPhase({ k: "form" });
        return;
      }
      setPhase({ k: "review", prep: json });
    } catch {
      setError("Network error while preparing the launch. Nothing was created — try again.");
      setPhase({ k: "form" });
    }
  };

  const signAndSend = async (prep: PrepareResponse) => {
    if (!signAllTransactions) {
      setError("This wallet does not support signing multiple transactions.");
      return;
    }
    setError(null);
    setPhase({ k: "signing", prep });
    try {
      const txs = prep.transactionsToSign.map((b) =>
        VersionedTransaction.deserialize(
          Uint8Array.from(atob(b), (c) => c.charCodeAt(0)),
        ),
      );
      let signed: VersionedTransaction[];
      try {
        signed = await signAllTransactions(txs);
      } catch {
        setError("Signature rejected in wallet. Nothing was created.");
        setPhase({ k: "review", prep });
        return;
      }
      setPhase({ k: "submitting", prep });
      const res = await fetch("/api/launch/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: prep.sessionId,
          signedTxs: signed.map((t) =>
            btoa(String.fromCharCode(...t.serialize())),
          ),
        }),
      });
      const json = (await res.json()) as
        | { bundleId: string; state: string }
        | ApiError;
      if ("error" in json) {
        if (json.error.code === "SESSION_NOT_FOUND") {
          setPhase({ k: "expired", prep });
        } else {
          setError(json.error.message);
          setPhase({ k: "review", prep });
        }
        return;
      }
      if (json.state === "simulated") {
        setPhase({ k: "landed", prep, simulated: true });
        return;
      }
      setPhase({ k: "pending", prep, bundleId: json.bundleId });
    } catch {
      setError("Submission failed. Launches are all-or-nothing: nothing landed on-chain. You can retry safely.");
      setPhase({ k: "review", prep });
    }
  };

  // poll bundle status
  useEffect(() => {
    if (phase.k !== "pending") return;
    const started = Date.now();
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/launch/status?bundle=${encodeURIComponent(phase.bundleId)}`,
        );
        const json = (await res.json()) as StatusResponse;
        if (json.state === "landed") {
          clearInterval(pollRef.current!);
          setPhase({ k: "landed", prep: phase.prep, slot: json.slot });
        } else if (json.state === "failed") {
          clearInterval(pollRef.current!);
          setError("The bundle failed to land. Nothing was created — you can retry with a fresh launch.");
          setPhase({ k: "expired", prep: phase.prep });
        } else if (Date.now() - started > 90_000) {
          clearInterval(pollRef.current!);
          setPhase({ k: "expired", prep: phase.prep });
        }
      } catch {
        /* keep polling */
      }
    }, 2500);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [phase]);

  const totalSol = useMemo(() => {
    if (phase.k === "review" || phase.k === "signing" || phase.k === "submitting")
      return fmtSol(phase.k === "review" ? phase.prep.cost.totalLamports : phase.prep.cost.totalLamports);
    return null;
  }, [phase]);

  // ── render ──────────────────────────────────────────────────────────

  if (!publicKey) {
    return (
      <div className="border border-line bg-surface rounded-sm p-10 text-center">
        <p className="font-mono text-sm text-muted mb-5">
          connect a wallet to launch a Thaw token
        </p>
        <div className="flex justify-center">
          <WalletButton />
        </div>
      </div>
    );
  }

  if (phase.k === "landed") {
    const { prep } = phase;
    return (
      <div className="border border-green-dim bg-surface rounded-sm overflow-hidden rise">
        <div className="px-6 py-4 border-b border-green-dim bg-green-dim/20 flex items-center gap-3">
          <span className="font-pixel text-green seal-stamp inline-block">≈ THAWING</span>
          <span className="font-mono text-xs text-muted">
            {phase.simulated
              ? "dry-run simulation succeeded — no real token was created"
              : `bundle landed${phase.slot ? ` in slot ${phase.slot}` : ""}`}
          </span>
        </div>
        <div className="p-6 space-y-4">
          <div className="font-mono text-sm">
            <div className="text-[11px] uppercase tracking-wider text-muted mb-1">mint</div>
            <div className="text-text break-all">{prep.mint}</div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 font-mono text-sm">
            {!phase.simulated && (
              <>
                <a
                  className="border border-line rounded-sm px-4 py-3 hover:border-green-dim transition-colors"
                  href={`https://pump.fun/coin/${prep.mint}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  pump.fun page →
                </a>
                <a
                  className="border border-line rounded-sm px-4 py-3 hover:border-green-dim transition-colors"
                  href={`https://solscan.io/token/${prep.mint}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  solscan →
                </a>
                <a
                  className="border border-line rounded-sm px-4 py-3 hover:border-green-dim transition-colors"
                  href={`https://lock.jup.ag/escrow/${prep.escrow}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  escrow on jupiter lock →
                </a>
              </>
            )}
            <Link
              className="border border-green-dim text-green rounded-sm px-4 py-3 hover:bg-green-dim/20 transition-colors"
              href={`/t/${prep.mint}`}
            >
              live certificate →
            </Link>
          </div>
          {!phase.simulated && (
            <a
              className="inline-block font-mono text-sm bg-green text-bg font-medium px-5 py-2.5 rounded-sm hover:bg-green-hi transition-colors"
              target="_blank"
              rel="noopener noreferrer"
              href={`https://x.com/intent/post?text=${encodeURIComponent(
                `just launched on Thaw — my dev bag melts in public on a fixed schedule, no cliff, capped size.\n\nthe whole schedule is on-chain from second zero. verify it:\n\nhttps://thaw.lol/t/${prep.mint}`,
              )}`}
            >
              share proof on X →
            </a>
          )}
        </div>
      </div>
    );
  }

  if (phase.k === "expired") {
    return (
      <div className="border border-amber/40 bg-surface rounded-sm p-8 rise">
        <div className="font-mono text-amber mb-2">bundle did not land</div>
        <p className="text-sm text-muted mb-5 leading-relaxed">
          The launch window expired before the bundle landed (network
          congestion or a low tip). Because launches are all-or-nothing,{" "}
          <span className="text-text">nothing was created and no SOL was spent</span>{" "}
          (aside from nothing — the transactions never executed). Rebuild and
          try again.
        </p>
        <button
          onClick={() => setPhase({ k: "form" })}
          className="font-mono text-sm bg-green text-bg font-medium px-5 py-2 rounded-sm hover:bg-green-hi transition-colors"
        >
          rebuild launch →
        </button>
      </div>
    );
  }

  if (phase.k === "review" || phase.k === "signing" || phase.k === "submitting" || phase.k === "pending") {
    const prep = phase.prep;
    const busy = phase.k !== "review";
    return (
      <div className="space-y-4 rise">
        <div className="border border-line bg-surface rounded-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-line font-mono text-[11px] uppercase tracking-wider text-muted">
            review — exactly what you are signing
          </div>
          <div className="divide-y divide-line">
            {prep.manifest.map((m) => (
              <div key={m.index} className="px-5 py-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-pixel text-[10px] text-muted">
                    TX {m.index}
                  </span>
                  <span className="font-mono text-sm text-text">{m.label}</span>
                  <span
                    className={`font-mono text-[10px] px-1.5 py-0.5 rounded-sm border ${
                      m.signer === "you"
                        ? "text-green border-green-dim"
                        : "text-muted border-line"
                    }`}
                  >
                    {m.signer === "you" ? "signed by you" : "signed by platform"}
                  </span>
                </div>
                <ul className="space-y-1">
                  {m.actions.map((a, i) => (
                    <li key={i} className="font-mono text-xs text-muted leading-relaxed">
                      <span className="text-green mr-1.5">·</span>
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="border border-line bg-surface rounded-sm p-5">
          <div className="font-mono text-[11px] uppercase tracking-wider text-muted mb-3">
            cost breakdown
          </div>
          <dl className="font-mono text-sm space-y-1.5">
            <Row k="dev buy (capped; becomes your thawing allocation)" v={fmtSol(prep.cost.devBuyLamports)} />
            <Row k="platform fee" v={fmtSol(prep.cost.platformFeeLamports)} />
            <Row k="jito tip (atomic bundle inclusion)" v={fmtSol(prep.cost.jitoTipLamports)} />
            <Row k="network rent + fees (est.)" v={`≈ ${fmtSol(prep.cost.estNetworkLamports)}`} />
            <div className="border-t border-line pt-1.5 mt-1.5">
              <Row k="total" v={`≈ ${fmtSol(prep.cost.totalLamports)}`} strong />
            </div>
          </dl>
          <div className="mt-4 font-mono text-xs text-muted leading-relaxed">
            you receive <span className="text-text">{fmtTokensRaw(prep.expectedTokensRaw)} tokens
            ({prep.expectedTokensPctOfSupply}% of supply)</span> — begins thawing{" "}
            <span className="text-text">immediately at launch</span>, fully thawed{" "}
            <span className="text-text">{fmtDate(prep.vestEndTs)}</span>.
          </div>
          {prep.dryRun && (
            <div className="mt-3 border border-amber/40 rounded-sm px-3 py-2 font-mono text-xs text-amber">
              DRY-RUN MODE: the pipeline will be simulated; no token will be
              created and no SOL will move.
            </div>
          )}
        </div>

        {error && <ErrorBox msg={error} />}

        <div className="flex items-center gap-3">
          <button
            onClick={() => signAndSend(prep)}
            disabled={busy}
            className="font-mono text-sm bg-green text-bg font-medium px-6 py-2.5 rounded-sm hover:bg-green-hi active:translate-y-px transition-all disabled:opacity-50"
          >
            {phase.k === "signing"
              ? "waiting for wallet…"
              : phase.k === "submitting"
                ? "submitting bundle…"
                : phase.k === "pending"
                  ? "landing…"
                  : prep.dryRun
                    ? "sign + simulate"
                    : "sign + launch"}
          </button>
          <button
            onClick={() => setPhase({ k: "form" })}
            disabled={busy}
            className="font-mono text-sm border border-line px-5 py-2.5 rounded-sm text-muted hover:text-text hover:border-green-dim transition-colors disabled:opacity-50"
          >
            back
          </button>
          {phase.k === "pending" && (
            <span className="font-mono text-xs text-muted">
              bundle in flight<span className="cursor-blink">▌</span> this
              usually takes a few seconds
            </span>
          )}
        </div>
      </div>
    );
  }

  // form + preparing
  const preparing = phase.k === "preparing";
  return (
    <div className="space-y-6">
      <div className="border border-line bg-surface rounded-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-line font-mono text-[11px] uppercase tracking-wider text-muted">
          token
        </div>
        <div className="p-5 grid gap-4 sm:grid-cols-2">
          <Field label="name" hint="max 32 chars">
            <input
              value={form.name}
              onChange={(e) => set({ name: e.target.value })}
              maxLength={32}
              placeholder="My Token"
              className={inputCls}
            />
          </Field>
          <Field label="ticker" hint="1–10 letters/numbers">
            <input
              value={form.symbol}
              onChange={(e) =>
                set({ symbol: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })
              }
              maxLength={10}
              placeholder="TOKEN"
              className={inputCls}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="description" hint="optional, max 600 chars">
              <textarea
                value={form.description}
                onChange={(e) => set({ description: e.target.value })}
                maxLength={600}
                rows={3}
                placeholder="what is this?"
                className={inputCls}
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="image" hint="png / jpg / gif / webp, max 4.3 MB">
              <div className="flex items-center gap-4">
                <label className="cursor-pointer border border-dashed border-line rounded-sm px-4 py-3 font-mono text-xs text-muted hover:border-green-dim hover:text-text transition-colors">
                  {image ? image.name : "choose file…"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp"
                    className="hidden"
                    onChange={(e) => onImage(e.target.files?.[0] ?? null)}
                  />
                </label>
                {imagePreview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imagePreview}
                    alt="preview"
                    className="w-14 h-14 rounded-sm object-cover border border-line"
                  />
                )}
              </div>
            </Field>
          </div>
        </div>
      </div>

      <div className="border border-green-dim bg-surface rounded-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-green-dim bg-green-dim/10 font-mono text-[11px] uppercase tracking-wider text-green">
          the thaw — your capped, melting allocation
        </div>
        <div className="p-5 space-y-5">
          <Field
            label={`dev buy (SOL)`}
            hint={`${MIN_DEV_BUY_SOL}–${MAX_DEV_BUY_SOL} SOL — hard-capped, bought first, then melts on the schedule below`}
          >
            <input
              value={form.devBuySol}
              onChange={(e) =>
                set({ devBuySol: e.target.value.replace(/[^0-9.]/g, "") })
              }
              inputMode="decimal"
              className={`${inputCls} max-w-40`}
            />
          </Field>
          <div>
            <div className="font-mono text-xs text-muted mb-2">thaw schedule (no cliff)</div>
            <div className="grid gap-2 sm:grid-cols-4">
              {SEAL_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => set({ presetId: p.id })}
                  className={`text-left border rounded-sm px-3 py-2.5 transition-colors ${
                    form.presetId === p.id
                      ? "border-green bg-green-dim/20"
                      : "border-line hover:border-green-dim"
                  }`}
                >
                  <div className={`font-mono text-sm ${form.presetId === p.id ? "text-green" : "text-text"}`}>
                    {p.label}
                  </div>
                  <div className="font-mono text-[11px] text-muted mt-0.5">{p.blurb}</div>
                </button>
              ))}
              <button
                onClick={() => set({ presetId: "custom" })}
                className={`text-left border rounded-sm px-3 py-2.5 transition-colors ${
                  form.presetId === "custom"
                    ? "border-green bg-green-dim/20"
                    : "border-line hover:border-green-dim"
                }`}
              >
                <div className={`font-mono text-sm ${form.presetId === "custom" ? "text-green" : "text-text"}`}>
                  Custom
                </div>
                <div className="font-mono text-[11px] text-muted mt-0.5">
                  set your own thaw duration
                </div>
              </button>
            </div>
            {form.presetId === "custom" && (
              <div className="grid grid-cols-2 gap-4 mt-3 max-w-sm rise">
                <Field label="thaw duration (days)" hint="min 3d — no cliff">
                  <input
                    value={form.linearDays}
                    onChange={(e) => set({ linearDays: e.target.value.replace(/\D/g, "") })}
                    inputMode="numeric"
                    className={inputCls}
                  />
                </Field>
              </div>
            )}
          </div>
          <div className="font-mono text-xs text-muted border-t border-line pt-4 leading-relaxed">
            your bag <span className="text-green">starts melting the moment the token launches</span> and
            releases at a steady hourly rate, fully thawed in {linearDays} days. no cliff, no
            surprise unlock wall. the schedule is{" "}
            <span className="text-green">uncancellable</span> — by you, by us, by anyone.
          </div>
        </div>
      </div>

      <div className="border border-line bg-surface rounded-sm overflow-hidden">
        <button
          onClick={() => setAdvanced((v) => !v)}
          className="w-full px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-muted text-left hover:text-text transition-colors"
        >
          {advanced ? "▾" : "▸"} socials (optional)
        </button>
        {advanced && (
          <div className="p-5 pt-0 grid gap-4 sm:grid-cols-3 rise">
            <Field label="website">
              <input value={form.website} onChange={(e) => set({ website: e.target.value })} placeholder="https://…" className={inputCls} />
            </Field>
            <Field label="x / twitter">
              <input value={form.twitter} onChange={(e) => set({ twitter: e.target.value })} placeholder="https://x.com/…" className={inputCls} />
            </Field>
            <Field label="telegram">
              <input value={form.telegram} onChange={(e) => set({ telegram: e.target.value })} placeholder="https://t.me/…" className={inputCls} />
            </Field>
          </div>
        )}
      </div>

      {error && <ErrorBox msg={error} />}

      <button
        onClick={prepare}
        disabled={preparing}
        className="font-mono text-base bg-green text-bg font-medium px-8 py-3 rounded-sm hover:bg-green-hi active:translate-y-px transition-all disabled:opacity-50"
      >
        {preparing ? "building bundle…" : "review launch →"}
      </button>
    </div>
  );
}

const inputCls =
  "w-full bg-surface-2 border border-line rounded-sm px-3 py-2 font-mono text-sm text-text placeholder:text-muted/50 focus:outline-none focus:border-green-dim transition-colors";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="font-mono text-xs text-text">{label}</span>
        {hint && <span className="font-mono text-[10px] text-muted">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className={strong ? "text-text" : "text-muted"}>{k}</dt>
      <dd className={strong ? "text-green" : "text-text"}>{v}</dd>
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="border border-red/40 bg-red/5 rounded-sm px-4 py-3 font-mono text-sm text-red rise">
      {msg}
    </div>
  );
}

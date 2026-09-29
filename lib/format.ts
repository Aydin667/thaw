export function lamportsToSol(lamports: string | number | bigint): number {
  return Number(lamports) / 1e9;
}

export function fmtSol(lamports: string | number | bigint, digits = 4): string {
  return `${lamportsToSol(lamports).toLocaleString("en-US", {
    maximumFractionDigits: digits,
  })} SOL`;
}

export function fmtTokensRaw(raw: string | bigint, decimals = 6): string {
  const n = BigInt(raw) / BigInt(10 ** decimals);
  return n.toLocaleString("en-US");
}

export function shortAddr(addr: string, n = 4): string {
  if (addr.length <= n * 2 + 1) return addr;
  return `${addr.slice(0, n)}…${addr.slice(-n)}`;
}

export function fmtDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function fmtDateTime(ts: number): string {
  return new Date(ts * 1000).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function daysUntil(ts: number): number {
  return Math.max(0, Math.ceil((ts * 1000 - Date.now()) / 86400000));
}

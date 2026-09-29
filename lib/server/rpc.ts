import "server-only";
import { Connection } from "@solana/web3.js";
import { env } from "./env";

let connection: Connection | null = null;

export function getConnection(): Connection {
  if (!connection) {
    connection = new Connection(env.rpcUrl, {
      commitment: "confirmed",
      disableRetryOnRateLimit: false,
    });
  }
  return connection;
}

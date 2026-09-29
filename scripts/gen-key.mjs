// Generates a platform keypair. Prints the base58 secret ONCE — store it in
// the PLATFORM_KEYPAIR env var (Render dashboard / .env.local), never in git.
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

const kp = Keypair.generate();
console.log("Public key :", kp.publicKey.toBase58());
console.log("PLATFORM_KEYPAIR=" + bs58.encode(kp.secretKey));

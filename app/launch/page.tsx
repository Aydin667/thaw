import type { Metadata } from "next";
import { LaunchForm } from "@/components/launch-form";

export const metadata: Metadata = {
  title: "Launch",
  description:
    "Launch a Pump.fun token with a capped dev bag that melts on a public schedule from second zero.",
};

export default function LaunchPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8">
        <h1 className="font-pixel text-2xl mb-2">
          <span className="text-green">&gt;</span> LAUNCH
        </h1>
        <p className="text-muted text-sm leading-relaxed max-w-xl">
          A real Pump.fun launch — same curve, same graduation — with one
          difference: your dev buy is deposited into an uncancellable vesting
          escrow in the same atomic bundle that creates the token.
        </p>
      </div>
      <LaunchForm />
    </div>
  );
}

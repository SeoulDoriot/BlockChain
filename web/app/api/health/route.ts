import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublicClient, getContractAddress } from "@/lib/chain/client";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

type CheckResult =
  | { ok: true; detail: string }
  | { ok: false; error: string };

async function checkDatabase(): Promise<CheckResult> {
  try {
    const supabase = createAdminClient();
    const { error, count } = await supabase
      .from("orgs")
      .select("id", { count: "exact", head: true });

    if (error) return { ok: false, error: error.message };
    return { ok: true, detail: `orgs reachable (${count ?? 0} rows)` };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

async function checkRpc(): Promise<CheckResult> {
  try {
    const client = getPublicClient();
    const chainId = await client.getChainId();

    if (chainId !== env.NEXT_PUBLIC_CHAIN_ID) {
      return {
        ok: false,
        error: `RPC reports chain ${chainId}, expected ${env.NEXT_PUBLIC_CHAIN_ID}`,
      };
    }
    return { ok: true, detail: `chain ${chainId}` };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

async function checkContract(): Promise<CheckResult> {
  try {
    const address = getContractAddress();
    const client = getPublicClient();
    const bytecode = await client.getCode({ address });

    if (!bytecode || bytecode === "0x") {
      return {
        ok: false,
        error: `no contract code at ${address} on chain ${env.NEXT_PUBLIC_CHAIN_ID}`,
      };
    }
    return { ok: true, detail: `${bytecode.length / 2 - 1} bytes at ${address}` };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

export async function GET() {
  const [database, rpc, contract] = await Promise.all([
    checkDatabase(),
    checkRpc(),
    checkContract(),
  ]);

  const healthy = database.ok && rpc.ok && contract.ok;

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      checks: { database, rpc, contract },
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 },
  );
}

import "server-only";

import { createPublicClient, http, type Address } from "viem";
import { polygonAmoy } from "viem/chains";
import { env } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";

/** Read-only chain client. Reads are free, so this needs no private key. */
export function getPublicClient() {
  return createPublicClient({
    chain: polygonAmoy,
    transport: http(serverEnv.RPC_URL),
  });
}

export function getContractAddress(): Address {
  return env.NEXT_PUBLIC_CONTRACT_ADDRESS as Address;
}

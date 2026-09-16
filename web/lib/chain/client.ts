import "server-only";

import {
  createPublicClient,
  createWalletClient,
  http,
  getContract,
  type Address,
  type GetContractReturnType,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { polygonAmoy } from "viem/chains";
import { env } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";
import { certificateRegistryAbi } from "@/lib/chain/abi";

/**
 * Chain clients are singletons.
 *
 * Creating a viem client per request would throw away connection reuse and the
 * request batching below. The globalThis cache keeps a single instance alive
 * across hot reloads in development, where module state is otherwise discarded
 * on every edit.
 *
 * `batch: true` coalesces concurrent eth_calls into a single JSON-RPC batch
 * request, which matters on the verify page: the status read and the record
 * read leave as one round trip instead of two.
 */
const globalForChain = globalThis as unknown as {
  __publicClient?: PublicClient;
  __walletClient?: WalletClient;
};

export function getPublicClient(): PublicClient {
  if (!globalForChain.__publicClient) {
    globalForChain.__publicClient = createPublicClient({
      chain: polygonAmoy,
      transport: http(serverEnv.RPC_URL, {
        batch: true,
        retryCount: 3,
        retryDelay: 250,
      }),
    }) as PublicClient;
  }
  return globalForChain.__publicClient;
}

export function getWalletClient(): WalletClient {
  if (!globalForChain.__walletClient) {
    const account = privateKeyToAccount(
      serverEnv.ISSUER_PRIVATE_KEY as `0x${string}`,
    );
    globalForChain.__walletClient = createWalletClient({
      account,
      chain: polygonAmoy,
      transport: http(serverEnv.RPC_URL, { batch: true }),
    });
  }
  return globalForChain.__walletClient;
}

export function getContractAddress(): Address {
  return env.NEXT_PUBLIC_CONTRACT_ADDRESS as Address;
}

export function getIssuerAddress(): Address {
  return privateKeyToAccount(serverEnv.ISSUER_PRIVATE_KEY as `0x${string}`)
    .address;
}

export type RegistryContract = GetContractReturnType<
  typeof certificateRegistryAbi,
  PublicClient
>;

/** Read-only contract handle. */
export function getRegistry(): RegistryContract {
  return getContract({
    address: getContractAddress(),
    abi: certificateRegistryAbi,
    client: getPublicClient(),
  });
}

export function explorerTxUrl(txHash: string): string {
  return `${env.NEXT_PUBLIC_EXPLORER_URL}/tx/${txHash}`;
}

export function explorerAddressUrl(address: string): string {
  return `${env.NEXT_PUBLIC_EXPLORER_URL}/address/${address}`;
}

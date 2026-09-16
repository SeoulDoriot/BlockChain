import "server-only";

import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  getContract,
  type Address,
  type Chain,
  type GetContractReturnType,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { polygonAmoy } from "viem/chains";
import { env, isLocalChain } from "@/lib/env";
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

/** Hardhat default local network. Uses NEXT_PUBLIC_CHAIN_ID so tests can pin it. */
const hardhatLocal = defineChain({
  id: env.NEXT_PUBLIC_CHAIN_ID,
  name: "Hardhat Local",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: [serverEnv.RPC_URL] },
    public: { http: [serverEnv.RPC_URL] },
  },
});

export function getChain(): Chain {
  return isLocalChain ? hardhatLocal : polygonAmoy;
}

export function getPublicClient(): PublicClient {
  if (!globalForChain.__publicClient) {
    globalForChain.__publicClient = createPublicClient({
      chain: getChain(),
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
      chain: getChain(),
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
  if (isLocalChain) return `local:tx:${txHash}`;
  return `${env.NEXT_PUBLIC_EXPLORER_URL}/tx/${txHash}`;
}

export function explorerAddressUrl(address: string): string {
  if (isLocalChain) return `local:address:${address}`;
  return `${env.NEXT_PUBLIC_EXPLORER_URL}/address/${address}`;
}

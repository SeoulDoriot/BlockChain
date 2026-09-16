import "server-only";

import type { Hex } from "viem";
import { certificateRegistryAbi } from "@/lib/chain/abi";
import {
  getContractAddress,
  getPublicClient,
  getWalletClient,
  getRegistry,
} from "@/lib/chain/client";
import { ChainStatus } from "@/lib/status";

export interface OnChainRecord {
  status: ChainStatus;
  issuedAt: Date | null;
  expiresAt: Date | null;
  revoked: boolean;
  issuer: string | null;
}

/**
 * Read a certificate's on-chain state.
 *
 * statusOf and getRecord are issued as two eth_calls, but the transport has
 * `batch: true`, so viem coalesces them into one JSON-RPC request. getRecord
 * reverts for an unknown hash, which is expected rather than exceptional — an
 * unissued certificate simply has no record.
 */
export async function getCertificate(certHash: Hex): Promise<OnChainRecord> {
  const registry = getRegistry();

  const [statusResult, recordResult] = await Promise.allSettled([
    registry.read.statusOf([certHash]),
    registry.read.getRecord([certHash]),
  ]);

  const status =
    statusResult.status === "fulfilled"
      ? (Number(statusResult.value) as ChainStatus)
      : ChainStatus.Unknown;

  if (recordResult.status !== "fulfilled") {
    return {
      status,
      issuedAt: null,
      expiresAt: null,
      revoked: status === ChainStatus.Revoked,
      issuer: null,
    };
  }

  const record = recordResult.value;

  return {
    status,
    issuedAt: record.issuedAt > 0n ? new Date(Number(record.issuedAt) * 1000) : null,
    expiresAt:
      record.expiresAt > 0n ? new Date(Number(record.expiresAt) * 1000) : null,
    revoked: record.revoked,
    issuer: record.issuer,
  };
}

/** Seconds since epoch for a YYYY-MM-DD expiry, or 0n for "never expires". */
export function toExpiryTimestamp(expiresOn: string | null): bigint {
  if (!expiresOn) return 0n;
  const ms = Date.parse(`${expiresOn}T00:00:00Z`);
  if (Number.isNaN(ms)) throw new Error(`Invalid expiry date: ${expiresOn}`);
  return BigInt(Math.floor(ms / 1000));
}

export interface WriteResult {
  txHash: Hex;
  blockNumber: bigint;
  gasUsed: bigint;
}

/** Anchor a hash and wait for the receipt. */
export async function issueOnChain(
  certHash: Hex,
  expiresOn: string | null,
): Promise<WriteResult> {
  const wallet = getWalletClient();
  const publicClient = getPublicClient();

  if (!wallet.account) throw new Error("Wallet client has no account.");

  const { request } = await publicClient.simulateContract({
    address: getContractAddress(),
    abi: certificateRegistryAbi,
    functionName: "issue",
    args: [certHash, toExpiryTimestamp(expiresOn)],
    account: wallet.account,
  });

  const txHash = await wallet.writeContract(request);
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
    confirmations: 1,
  });

  if (receipt.status !== "success") {
    throw new Error(`Transaction reverted: ${txHash}`);
  }

  return {
    txHash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed,
  };
}

/** Revoke a hash and wait for the receipt. */
export async function revokeOnChain(
  certHash: Hex,
  reason: string,
): Promise<WriteResult> {
  const wallet = getWalletClient();
  const publicClient = getPublicClient();

  if (!wallet.account) throw new Error("Wallet client has no account.");

  const { request } = await publicClient.simulateContract({
    address: getContractAddress(),
    abi: certificateRegistryAbi,
    functionName: "revoke",
    args: [certHash, reason],
    account: wallet.account,
  });

  const txHash = await wallet.writeContract(request);
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
    confirmations: 1,
  });

  if (receipt.status !== "success") {
    throw new Error(`Transaction reverted: ${txHash}`);
  }

  return {
    txHash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed,
  };
}

/** Grant ISSUER_ROLE to another wallet (multi-issuer admin page). */
export async function grantIssuerRole(address: `0x${string}`): Promise<Hex> {
  const wallet = getWalletClient();
  const publicClient = getPublicClient();
  if (!wallet.account) throw new Error("Wallet client has no account.");

  const issuerRole = await getRegistry().read.ISSUER_ROLE();

  const { request } = await publicClient.simulateContract({
    address: getContractAddress(),
    abi: certificateRegistryAbi,
    functionName: "grantRole",
    args: [issuerRole, address],
    account: wallet.account,
  });

  const txHash = await wallet.writeContract(request);
  await publicClient.waitForTransactionReceipt({ hash: txHash });
  return txHash;
}

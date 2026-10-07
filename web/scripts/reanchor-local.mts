/**
 * Re-record existing certificates on a fresh LOCAL chain.
 *
 * The local Hardhat node keeps no state: restart it and every certificate
 * anchored before is gone from the chain, so the verifier reads "Not found"
 * even though the database still has the details. This writes each stored
 * certificate hash back on-chain. A certificate's hash depends only on its
 * fields, never on the chain, so nothing about the certificate changes.
 *
 * Refuses to run against any chain but the local one.
 *
 *   npm run local:reanchor
 */
import { createAdminClient } from "../lib/supabase/admin";
import { getCertificate, issueOnChain, revokeOnChain } from "../lib/chain/registry";
import { env } from "../lib/env";
import { ChainStatus, isExpired } from "../lib/status";
import type { Hex } from "viem";

if (env.NEXT_PUBLIC_CHAIN !== "local") {
  console.error("Refusing to run: this only repairs a local chain, and NEXT_PUBLIC_CHAIN is not 'local'.");
  process.exit(1);
}

const supabase = createAdminClient();
const { data, error } = await supabase
  .from("certificates")
  .select("id, cert_hash, expires_on, status, revoked_reason")
  .in("status", ["issued", "revoked"])
  .not("cert_hash", "is", null)
  .order("created_at");

if (error) throw new Error(error.message);

let restored = 0;
let already = 0;
let failed = 0;

for (const row of data ?? []) {
  const hash = row.cert_hash as Hex;
  try {
    const onChain = await getCertificate(hash);
    if (onChain.status !== ChainStatus.Unknown) {
      already++;
      continue;
    }

    // The contract refuses an expiry in the past. An already-expired
    // certificate is anchored without one; the verifier still reports it as
    // expired from its stored date.
    const expiry = isExpired(row.expires_on) ? null : row.expires_on;
    const receipt = await issueOnChain(hash, expiry);

    if (row.status === "revoked") {
      await revokeOnChain(hash, row.revoked_reason ?? "Revoked");
    }

    await supabase
      .from("certificates")
      .update({ tx_hash: receipt.txHash, chain_id: env.NEXT_PUBLIC_CHAIN_ID })
      .eq("id", row.id);

    restored++;
    console.log(`restored ${row.id} (${row.status})`);
  } catch (e) {
    failed++;
    console.error(`FAILED ${row.id}: ${(e as Error).message}`);
  }
}

console.log(`\nDone. restored ${restored}, already on chain ${already}, failed ${failed}.`);
process.exit(failed > 0 ? 1 : 0);

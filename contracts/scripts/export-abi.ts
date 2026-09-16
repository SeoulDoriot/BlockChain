/**
 * Exports the compiled CertificateRegistry ABI into the web app as a
 * TypeScript `as const` literal, so viem can infer argument and return
 * types from it.
 *
 * Run with: npm run export-abi
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

const ARTIFACT = resolve(
  here,
  "../artifacts/contracts/CertificateRegistry.sol/CertificateRegistry.json",
);
const OUT = resolve(here, "../../web/lib/chain/abi.ts");

async function main() {
  let raw: string;
  try {
    raw = await readFile(ARTIFACT, "utf8");
  } catch {
    throw new Error(
      `Artifact not found at ${ARTIFACT}. Run \`npm run compile\` first.`,
    );
  }

  const { abi } = JSON.parse(raw) as { abi: unknown[] };
  if (!Array.isArray(abi) || abi.length === 0) {
    throw new Error("Artifact contained no ABI.");
  }

  const contents = `// GENERATED FILE — DO NOT EDIT.
// Produced by contracts/scripts/export-abi.ts. Re-run \`npm run export-abi\`
// in contracts/ after changing CertificateRegistry.sol.

export const certificateRegistryAbi = ${JSON.stringify(abi, null, 2)} as const;

export type CertificateRegistryAbi = typeof certificateRegistryAbi;

/** Mirrors the Status enum in CertificateRegistry.sol. */
export const CertificateStatus = {
  Unknown: 0,
  Active: 1,
  Expired: 2,
  Revoked: 3,
} as const;

export type CertificateStatus =
  (typeof CertificateStatus)[keyof typeof CertificateStatus];
`;

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, contents, "utf8");

  console.log(`Wrote ${abi.length} ABI entries to ${OUT}`);
}

await main();

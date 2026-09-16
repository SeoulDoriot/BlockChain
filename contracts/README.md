# contracts

Hardhat 3 project for `CertificateRegistry` — the on-chain anchor for KIT
certificates.

The contract stores **only** keccak256 hashes and timestamps. No names, no
email addresses, no course titles. See [CLAUDE.md §4](../CLAUDE.md) rule 1.

## Requirements

- Node 22.13 or newer
- npm

```bash
npm install
```

## Test

```bash
npm test
```

Runs 30 tests with the Node.js test runner and viem against an in-process
Hardhat network. Expiry tests use the network helpers to travel forwards in
time. Everything must be green before the contract is deployed anywhere.

## Compile

```bash
npm run compile
```

Solidity 0.8.28, optimizer enabled at 200 runs.

## Configure secrets

Secrets are **never** written to a file in this repo. They live in Hardhat's
encrypted keystore and are read through `configVariable()` in
`hardhat.config.ts`. Set them once, interactively:

```bash
npx hardhat keystore set AMOY_RPC_URL
npx hardhat keystore set AMOY_PRIVATE_KEY
npx hardhat keystore set ETHERSCAN_API_KEY
```

Use a throwaway deployer key funded only with testnet POL. Never a wallet that
holds anything of value.

## Deploy to Polygon Amoy

```bash
npm run deploy:amoy
```

Ignition deploys `ignition/modules/CertificateRegistry.ts`, passing account 0 as
the admin — that account receives `DEFAULT_ADMIN_ROLE` and `ISSUER_ROLE`.
Deployment state is written to `ignition/deployments/`, which is committed for
real networks so the deployment can be resumed or audited. Local chain state
(`chain-31337/`) is ignored.

Get testnet POL from a Polygon Amoy faucet before deploying.

## Verify on PolygonScan

```bash
npm run verify -- <DEPLOYED_ADDRESS> <ADMIN_ADDRESS>
```

The constructor argument must be passed because the source is verified against
the exact deployment bytecode. Hardhat already knows chain 80002, so no
`chainDescriptors` entry is needed.

Alternatively, verify straight from the Ignition deployment:

```bash
npx hardhat ignition verify chain-80002
```

## Export the ABI to the web app

```bash
npm run export-abi
```

Writes `../web/lib/chain/abi.ts` as a TypeScript `as const` literal so viem can
infer types from it. Re-run after any change to the contract. That file is
generated — never edit it by hand.

## Layout

| Path | What |
| ---- | ---- |
| `contracts/CertificateRegistry.sol` | The contract |
| `test/CertificateRegistry.ts` | 30 tests, node:test + viem |
| `ignition/modules/CertificateRegistry.ts` | Deployment module |
| `scripts/export-abi.ts` | ABI → web app |

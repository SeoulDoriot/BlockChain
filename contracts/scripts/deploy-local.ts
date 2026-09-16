/**
 * Deploy CertificateRegistry to a local Hardhat node.
 *
 * Assumes \`npx hardhat node\` is running on http://127.0.0.1:8545. Prints the
 * deployed address so it can be exported into web/.env.local as
 * NEXT_PUBLIC_CONTRACT_ADDRESS.
 */
import { network } from "hardhat";

const { viem } = await network.connect({ network: "localhost" });

const [deployer] = await viem.getWalletClients();

const registry = await viem.deployContract("CertificateRegistry", [
  deployer.account.address,
]);

console.log("CertificateRegistry deployed:");
console.log("  address :", registry.address);
console.log("  admin   :", deployer.account.address);
console.log("  chainId : 31337 (local)");

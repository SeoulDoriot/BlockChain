import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Deploys CertificateRegistry with the deploying account as admin.
 *
 * The admin receives both DEFAULT_ADMIN_ROLE and ISSUER_ROLE. Grant
 * ISSUER_ROLE to additional staff wallets after deployment rather than
 * sharing the admin key.
 */
export default buildModule("CertificateRegistryModule", (m) => {
  const admin = m.getAccount(0);

  const certificateRegistry = m.contract("CertificateRegistry", [admin]);

  return { certificateRegistry };
});

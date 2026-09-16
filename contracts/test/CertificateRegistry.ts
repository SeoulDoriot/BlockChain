import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { keccak256, toHex, zeroAddress } from "viem";
import { network } from "hardhat";

const { viem, networkHelpers } = await network.create();

/** Deterministic bytes32 test hashes. */
function h(label: string): `0x${string}` {
  return keccak256(toHex(label));
}

const ZERO_HASH = `0x${"0".repeat(64)}` as const;

/** Status enum, mirrors the contract. */
const Status = {
  Unknown: 0,
  Active: 1,
  Expired: 2,
  Revoked: 3,
} as const;

const ISSUER_ROLE = keccak256(toHex("ISSUER_ROLE"));
const DEFAULT_ADMIN_ROLE = ZERO_HASH;

const ONE_YEAR = 365n * 24n * 60n * 60n;

async function deployFixture() {
  const [admin, issuer, outsider] = await viem.getWalletClients();
  const registry = await viem.deployContract("CertificateRegistry", [
    admin.account.address,
  ]);
  return { registry, admin, issuer, outsider };
}

/** A timestamp comfortably in the future relative to the chain clock. */
async function futureExpiry(offset: bigint = ONE_YEAR): Promise<bigint> {
  const now = BigInt(await networkHelpers.time.latest());
  return now + offset;
}

describe("CertificateRegistry", () => {
  describe("Deployment & roles", () => {
    it("1. grants DEFAULT_ADMIN_ROLE to the constructor admin", async () => {
      const { registry, admin } = await networkHelpers.loadFixture(deployFixture);
      assert.equal(
        await registry.read.hasRole([DEFAULT_ADMIN_ROLE, admin.account.address]),
        true,
      );
    });

    it("2. grants ISSUER_ROLE to the constructor admin", async () => {
      const { registry, admin } = await networkHelpers.loadFixture(deployFixture);
      assert.equal(
        await registry.read.hasRole([ISSUER_ROLE, admin.account.address]),
        true,
      );
    });

    it("3. reverts with InvalidAdmin when deployed with the zero address", async () => {
      await assert.rejects(
        () => viem.deployContract("CertificateRegistry", [zeroAddress]),
        /InvalidAdmin/,
      );
    });

    it("4. lets the admin grant ISSUER_ROLE to another account", async () => {
      const { registry, issuer } = await networkHelpers.loadFixture(deployFixture);
      await registry.write.grantRole([ISSUER_ROLE, issuer.account.address]);
      assert.equal(
        await registry.read.hasRole([ISSUER_ROLE, issuer.account.address]),
        true,
      );

      // and that account can now issue
      await registry.write.issue([h("granted"), 0n], { account: issuer.account });
      assert.equal(await registry.read.statusOf([h("granted")]), Status.Active);
    });

    it("5. lets the admin revoke ISSUER_ROLE; the account can no longer issue", async () => {
      const { registry, issuer } = await networkHelpers.loadFixture(deployFixture);
      await registry.write.grantRole([ISSUER_ROLE, issuer.account.address]);
      await registry.write.revokeRole([ISSUER_ROLE, issuer.account.address]);

      assert.equal(
        await registry.read.hasRole([ISSUER_ROLE, issuer.account.address]),
        false,
      );
      await viem.assertions.revertWithCustomError(
        registry.write.issue([h("after-revoke"), 0n], { account: issuer.account }),
        registry,
        "AccessControlUnauthorizedAccount",
      );
    });

    it("6. reverts when a non-admin calls grantRole", async () => {
      const { registry, outsider } = await networkHelpers.loadFixture(deployFixture);
      await viem.assertions.revertWithCustomError(
        registry.write.grantRole([ISSUER_ROLE, outsider.account.address], {
          account: outsider.account,
        }),
        registry,
        "AccessControlUnauthorizedAccount",
      );
    });
  });

  describe("Issuing", () => {
    it("7. stores the record and reports Active", async () => {
      const { registry } = await networkHelpers.loadFixture(deployFixture);
      await registry.write.issue([h("cert-7"), await futureExpiry()]);
      assert.equal(await registry.read.statusOf([h("cert-7")]), Status.Active);
    });

    it("8. emits CertificateIssued with the right args", async () => {
      const { registry, admin } = await networkHelpers.loadFixture(deployFixture);
      const expiresAt = await futureExpiry();
      await viem.assertions.emitWithArgs(
        registry.write.issue([h("cert-8"), expiresAt]),
        registry,
        "CertificateIssued",
        [
          h("cert-8"),
          // viem normalises addresses to checksum form in decoded logs
          (value: unknown) =>
            String(value).toLowerCase() === admin.account.address.toLowerCase(),
          (value: unknown) => typeof value === "bigint" && value > 0n,
          expiresAt,
        ],
      );
    });

    it("9. records msg.sender as the issuer", async () => {
      const { registry, issuer } = await networkHelpers.loadFixture(deployFixture);
      await registry.write.grantRole([ISSUER_ROLE, issuer.account.address]);
      await registry.write.issue([h("cert-9"), 0n], { account: issuer.account });

      const record = await registry.read.getRecord([h("cert-9")]);
      assert.equal(
        record.issuer.toLowerCase(),
        issuer.account.address.toLowerCase(),
      );
    });

    it("10. accepts expiresAt == 0 and never expires", async () => {
      const { registry } = await networkHelpers.loadFixture(deployFixture);
      await registry.write.issue([h("cert-10"), 0n]);
      assert.equal(await registry.read.statusOf([h("cert-10")]), Status.Active);

      await networkHelpers.time.increase(100n * ONE_YEAR);
      assert.equal(await registry.read.statusOf([h("cert-10")]), Status.Active);
    });

    it("11. reverts CertificateAlreadyIssued on a duplicate hash", async () => {
      const { registry } = await networkHelpers.loadFixture(deployFixture);
      await registry.write.issue([h("cert-11"), 0n]);
      await viem.assertions.revertWithCustomError(
        registry.write.issue([h("cert-11"), 0n]),
        registry,
        "CertificateAlreadyIssued",
      );
    });

    it("12. reverts InvalidCertHash for the zero hash", async () => {
      const { registry } = await networkHelpers.loadFixture(deployFixture);
      await viem.assertions.revertWithCustomError(
        registry.write.issue([ZERO_HASH, 0n]),
        registry,
        "InvalidCertHash",
      );
    });

    it("13. reverts InvalidExpiry for an expiry in the past", async () => {
      const { registry } = await networkHelpers.loadFixture(deployFixture);
      const past = BigInt(await networkHelpers.time.latest()) - 1n;
      await viem.assertions.revertWithCustomError(
        registry.write.issue([h("cert-13"), past]),
        registry,
        "InvalidExpiry",
      );
    });

    it("14. reverts when the caller lacks ISSUER_ROLE", async () => {
      const { registry, outsider } = await networkHelpers.loadFixture(deployFixture);
      await viem.assertions.revertWithCustomError(
        registry.write.issue([h("cert-14"), 0n], { account: outsider.account }),
        registry,
        "AccessControlUnauthorizedAccount",
      );
    });
  });

  describe("Batch issuing", () => {
    it("15. anchors every hash in the array", async () => {
      const { registry } = await networkHelpers.loadFixture(deployFixture);
      const hashes = [h("batch-a"), h("batch-b"), h("batch-c")];
      const expiry = await futureExpiry();

      await registry.write.issueBatch([hashes, [expiry, 0n, expiry]]);

      for (const hash of hashes) {
        assert.equal(await registry.read.statusOf([hash]), Status.Active);
      }
    });

    it("16. reverts LengthMismatch on mismatched array lengths", async () => {
      const { registry } = await networkHelpers.loadFixture(deployFixture);
      await viem.assertions.revertWithCustomError(
        registry.write.issueBatch([[h("x"), h("y")], [0n]]),
        registry,
        "LengthMismatch",
      );
    });

    it("17. reverts the whole batch if any entry is invalid (atomicity)", async () => {
      const { registry } = await networkHelpers.loadFixture(deployFixture);

      await viem.assertions.revertWithCustomError(
        registry.write.issueBatch([
          [h("atomic-ok"), ZERO_HASH],
          [0n, 0n],
        ]),
        registry,
        "InvalidCertHash",
      );

      // the valid entry that preceded the bad one must NOT have been written
      assert.equal(
        await registry.read.statusOf([h("atomic-ok")]),
        Status.Unknown,
      );
    });
  });

  describe("Revocation", () => {
    it("18. flips the status to Revoked", async () => {
      const { registry } = await networkHelpers.loadFixture(deployFixture);
      await registry.write.issue([h("cert-18"), 0n]);
      await registry.write.revoke([h("cert-18"), "issued in error"]);
      assert.equal(await registry.read.statusOf([h("cert-18")]), Status.Revoked);
    });

    it("19. emits CertificateRevoked with the reason", async () => {
      const { registry, admin } = await networkHelpers.loadFixture(deployFixture);
      await registry.write.issue([h("cert-19"), 0n]);

      await viem.assertions.emitWithArgs(
        registry.write.revoke([h("cert-19"), "academic misconduct"]),
        registry,
        "CertificateRevoked",
        [
          h("cert-19"),
          (value: unknown) =>
            String(value).toLowerCase() === admin.account.address.toLowerCase(),
          (value: unknown) => typeof value === "bigint" && value > 0n,
          "academic misconduct",
        ],
      );
    });

    it("20. reverts CertificateNotFound for an unknown hash", async () => {
      const { registry } = await networkHelpers.loadFixture(deployFixture);
      await viem.assertions.revertWithCustomError(
        registry.write.revoke([h("never-issued"), "nope"]),
        registry,
        "CertificateNotFound",
      );
    });

    it("21. reverts CertificateAlreadyRevoked on a second revoke", async () => {
      const { registry } = await networkHelpers.loadFixture(deployFixture);
      await registry.write.issue([h("cert-21"), 0n]);
      await registry.write.revoke([h("cert-21"), "first"]);
      await viem.assertions.revertWithCustomError(
        registry.write.revoke([h("cert-21"), "second"]),
        registry,
        "CertificateAlreadyRevoked",
      );
    });

    it("22. reverts when a non-issuer calls revoke", async () => {
      const { registry, outsider } = await networkHelpers.loadFixture(deployFixture);
      await registry.write.issue([h("cert-22"), 0n]);
      await viem.assertions.revertWithCustomError(
        registry.write.revoke([h("cert-22"), "not mine"], {
          account: outsider.account,
        }),
        registry,
        "AccessControlUnauthorizedAccount",
      );
    });

    it("23. keeps Revoked precedence after the expiry passes", async () => {
      const { registry } = await networkHelpers.loadFixture(deployFixture);
      const expiresAt = await futureExpiry(1000n);

      await registry.write.issue([h("cert-23"), expiresAt]);
      await registry.write.revoke([h("cert-23"), "revoked before expiry"]);

      await networkHelpers.time.increaseTo(expiresAt + 1n);

      assert.equal(await registry.read.statusOf([h("cert-23")]), Status.Revoked);
    });
  });

  describe("Expiry (time travel)", () => {
    it("24. is Active one second before expiresAt", async () => {
      const { registry } = await networkHelpers.loadFixture(deployFixture);
      const expiresAt = await futureExpiry(1000n);
      await registry.write.issue([h("cert-24"), expiresAt]);

      await networkHelpers.time.increaseTo(expiresAt - 1n);
      assert.equal(await registry.read.statusOf([h("cert-24")]), Status.Active);
    });

    it("25. is Expired exactly at expiresAt (inclusive boundary)", async () => {
      const { registry } = await networkHelpers.loadFixture(deployFixture);
      const expiresAt = await futureExpiry(1000n);
      await registry.write.issue([h("cert-25"), expiresAt]);

      await networkHelpers.time.increaseTo(expiresAt);
      assert.equal(await registry.read.statusOf([h("cert-25")]), Status.Expired);
    });

    it("26. is Expired well after expiresAt", async () => {
      const { registry } = await networkHelpers.loadFixture(deployFixture);
      const expiresAt = await futureExpiry(1000n);
      await registry.write.issue([h("cert-26"), expiresAt]);

      await networkHelpers.time.increaseTo(expiresAt + ONE_YEAR);
      assert.equal(await registry.read.statusOf([h("cert-26")]), Status.Expired);
    });

    it("27. allows an expired certificate to still be revoked", async () => {
      const { registry } = await networkHelpers.loadFixture(deployFixture);
      const expiresAt = await futureExpiry(1000n);
      await registry.write.issue([h("cert-27"), expiresAt]);

      await networkHelpers.time.increaseTo(expiresAt + 10n);
      assert.equal(await registry.read.statusOf([h("cert-27")]), Status.Expired);

      await registry.write.revoke([h("cert-27"), "revoked after expiry"]);
      assert.equal(await registry.read.statusOf([h("cert-27")]), Status.Revoked);
    });
  });

  describe("Reads", () => {
    it("28. returns Unknown for a never-issued hash", async () => {
      const { registry } = await networkHelpers.loadFixture(deployFixture);
      assert.equal(
        await registry.read.statusOf([h("ghost")]),
        Status.Unknown,
      );
    });

    it("29. isValid is true only for Active", async () => {
      const { registry } = await networkHelpers.loadFixture(deployFixture);

      // unknown
      assert.equal(await registry.read.isValid([h("unknown-29")]), false);

      // active
      await registry.write.issue([h("active-29"), 0n]);
      assert.equal(await registry.read.isValid([h("active-29")]), true);

      // revoked
      await registry.write.issue([h("revoked-29"), 0n]);
      await registry.write.revoke([h("revoked-29"), "r"]);
      assert.equal(await registry.read.isValid([h("revoked-29")]), false);

      // expired
      const expiresAt = await futureExpiry(1000n);
      await registry.write.issue([h("expired-29"), expiresAt]);
      await networkHelpers.time.increaseTo(expiresAt);
      assert.equal(await registry.read.isValid([h("expired-29")]), false);
    });

    it("30. getRecord returns the struct, and reverts for an unknown hash", async () => {
      const { registry, admin } = await networkHelpers.loadFixture(deployFixture);
      const expiresAt = await futureExpiry();
      await registry.write.issue([h("cert-30"), expiresAt]);

      const record = await registry.read.getRecord([h("cert-30")]);
      assert.equal(record.expiresAt, expiresAt);
      assert.equal(record.revoked, false);
      assert.ok(record.issuedAt > 0n);
      assert.equal(
        record.issuer.toLowerCase(),
        admin.account.address.toLowerCase(),
      );

      await viem.assertions.revertWithCustomError(
        registry.read.getRecord([h("missing-30")]),
        registry,
        "CertificateNotFound",
      );
    });
  });
});

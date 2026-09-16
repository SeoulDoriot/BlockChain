// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title CertificateRegistry
/// @notice Anchors certificate hashes on-chain. Stores no personal data.
/// @dev Only keccak256 digests and timestamps are written. Names, emails and
///      course details never touch the chain — see CLAUDE.md §4 rule 1.
contract CertificateRegistry is AccessControl {
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");

    enum Status {
        Unknown, // 0 — never issued
        Active, // 1
        Expired, // 2
        Revoked // 3
    }

    struct Record {
        uint64 issuedAt; // block timestamp at issue
        uint64 expiresAt; // 0 == never expires
        bool revoked;
        address issuer;
    }

    mapping(bytes32 certHash => Record) private _records;

    event CertificateIssued(
        bytes32 indexed certHash,
        address indexed issuer,
        uint64 issuedAt,
        uint64 expiresAt
    );
    event CertificateRevoked(
        bytes32 indexed certHash,
        address indexed revokedBy,
        uint64 revokedAt,
        string reason
    );

    error InvalidAdmin();
    error InvalidCertHash();
    error InvalidExpiry(uint64 expiresAt);
    error CertificateAlreadyIssued(bytes32 certHash);
    error CertificateNotFound(bytes32 certHash);
    error CertificateAlreadyRevoked(bytes32 certHash);
    error LengthMismatch();

    constructor(address admin) {
        if (admin == address(0)) revert InvalidAdmin();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ISSUER_ROLE, admin);
    }

    /// @notice Anchor one certificate hash.
    /// @param certHash keccak256 of the canonical payload (CLAUDE.md §3).
    /// @param expiresAt Unix seconds, or 0 for no expiry. Must be in the future.
    function issue(bytes32 certHash, uint64 expiresAt) external onlyRole(ISSUER_ROLE) {
        _issue(certHash, expiresAt);
    }

    /// @notice Anchor many hashes in one transaction. All-or-nothing.
    function issueBatch(bytes32[] calldata certHashes, uint64[] calldata expiries)
        external
        onlyRole(ISSUER_ROLE)
    {
        if (certHashes.length != expiries.length) revert LengthMismatch();
        for (uint256 i = 0; i < certHashes.length; ++i) {
            _issue(certHashes[i], expiries[i]);
        }
    }

    /// @notice Permanently mark a certificate revoked.
    function revoke(bytes32 certHash, string calldata reason) external onlyRole(ISSUER_ROLE) {
        Record storage r = _records[certHash];
        if (r.issuedAt == 0) revert CertificateNotFound(certHash);
        if (r.revoked) revert CertificateAlreadyRevoked(certHash);
        r.revoked = true;
        emit CertificateRevoked(certHash, msg.sender, uint64(block.timestamp), reason);
    }

    /// @notice Status derived at read time — no cron job, no keeper, no upkeep.
    /// @dev Expiry is a comparison against the current block timestamp, so a
    ///      certificate becomes Expired on its own the moment the chain's clock
    ///      passes expiresAt. Revocation takes precedence over expiry.
    function statusOf(bytes32 certHash) public view returns (Status) {
        Record storage r = _records[certHash];
        if (r.issuedAt == 0) return Status.Unknown;
        if (r.revoked) return Status.Revoked;
        if (r.expiresAt != 0 && block.timestamp >= r.expiresAt) return Status.Expired;
        return Status.Active;
    }

    function isValid(bytes32 certHash) external view returns (bool) {
        return statusOf(certHash) == Status.Active;
    }

    function getRecord(bytes32 certHash) external view returns (Record memory) {
        Record memory r = _records[certHash];
        if (r.issuedAt == 0) revert CertificateNotFound(certHash);
        return r;
    }

    function _issue(bytes32 certHash, uint64 expiresAt) private {
        if (certHash == bytes32(0)) revert InvalidCertHash();
        if (_records[certHash].issuedAt != 0) revert CertificateAlreadyIssued(certHash);
        if (expiresAt != 0 && expiresAt <= block.timestamp) revert InvalidExpiry(expiresAt);

        _records[certHash] = Record({
            issuedAt: uint64(block.timestamp),
            expiresAt: expiresAt,
            revoked: false,
            issuer: msg.sender
        });

        emit CertificateIssued(certHash, msg.sender, uint64(block.timestamp), expiresAt);
    }
}

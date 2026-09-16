-- ===========================================================================
-- 0003_pdf_fingerprint.sql — store a fingerprint of the issued PDF
--
-- The certificate hash (cert_hash) covers the certificate's FIELDS, so that a
-- regenerated PDF still verifies. That is the right choice for verification,
-- but it means the field hash alone cannot answer "is this exact file the one
-- you sent me?".
--
-- pdf_sha256 answers that. It is the SHA-256 of the PDF bytes as generated,
-- and it powers the upload tamper check: hash the uploaded file, look for a
-- match. One changed byte and there is no match.
-- ===========================================================================

alter table public.certificates
  add column pdf_sha256 text
  check (pdf_sha256 is null or pdf_sha256 ~ '^[0-9a-f]{64}$');

create index certificates_pdf_sha256_idx
  on public.certificates (pdf_sha256);

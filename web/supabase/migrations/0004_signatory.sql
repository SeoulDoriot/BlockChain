-- Who signs a certificate: a name, a title ("Chairman", "Dean"…) and an optional
-- signature image. Set once per organisation, then copied onto each certificate
-- at issue time so a later change never alters one that already exists.
--
-- None of this is part of the hashed payload (CLAUDE.md §3): it is presentation,
-- so adding or changing it cannot affect verification.

alter table public.orgs
  add column signatory_name  text,
  add column signatory_title text,
  add column signature_path  text;

alter table public.certificates
  add column signatory_name  text,
  add column signatory_title text,
  add column signature_path  text;

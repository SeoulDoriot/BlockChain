-- Preserve the original design on existing certificates; new issues explicitly
-- select kit-red. These presentation fields do not change the canonical hash.
alter table public.certificates
  add column template_id text not null default 'classic'
    check (template_id in ('classic', 'kit-red')),
  add column certificate_title text not null default 'Certificate of Completion'
    check (char_length(certificate_title) between 1 and 100),
  add column description text not null default 'has successfully completed'
    check (char_length(description) between 1 and 180);

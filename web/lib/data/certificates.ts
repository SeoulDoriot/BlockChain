import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Certificate queries.
 *
 * Every select names its columns — never `*` — and relations are embedded in
 * the same round trip so a list of 20 certificates is one query, not 21.
 * Pagination is done in the database with `.range()`, never by fetching
 * everything and slicing in JavaScript.
 */

export interface CertificateRow {
  id: string;
  recipient_name: string;
  recipient_email: string;
  issued_on: string;
  expires_on: string | null;
  cert_hash: string | null;
  tx_hash: string | null;
  chain_id: number | null;
  pdf_path: string | null;
  status: "draft" | "issued" | "revoked";
  revoked_reason: string | null;
  created_at: string;
  org_id: string;
  course: { id: string; code: string; title: string } | null;
  issuer: { id: string; full_name: string | null; email: string } | null;
}

const LIST_COLUMNS = `
  id, recipient_name, recipient_email, issued_on, expires_on,
  cert_hash, tx_hash, chain_id, pdf_path, status, revoked_reason,
  created_at, org_id,
  course:courses!certificates_course_id_fkey ( id, code, title ),
  issuer:staff!certificates_issued_by_fkey ( id, full_name, email )
`;

export interface ListOptions {
  page?: number;
  pageSize?: number;
  status?: "draft" | "issued" | "revoked";
  search?: string;
}

export interface ListResult {
  rows: CertificateRow[];
  total: number;
  page: number;
  pageSize: number;
}

/** Staff-facing list. Runs as the signed-in user, so RLS scopes it to their org. */
export async function listCertificates(
  options: ListOptions = {},
): Promise<ListResult> {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 20));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createClient();

  let query = supabase
    .from("certificates")
    .select(LIST_COLUMNS, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (options.status) {
    query = query.eq("status", options.status);
  }

  if (options.search) {
    const term = `%${options.search}%`;
    query = query.or(
      `recipient_name.ilike.${term},recipient_email.ilike.${term}`,
    );
  }

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);

  return {
    rows: (data ?? []) as unknown as CertificateRow[],
    total: count ?? 0,
    page,
    pageSize,
  };
}

/** Staff-facing single certificate. RLS-scoped. */
export async function getCertificateForStaff(
  id: string,
): Promise<CertificateRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("certificates")
    .select(LIST_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  return (data as unknown as CertificateRow) ?? null;
}

/**
 * Public verification view.
 *
 * Uses the admin client because anonymous visitors have no table access at
 * all, and returns only the whitelisted columns — the recipient's email
 * address is deliberately absent.
 */
export interface PublicCertificate {
  id: string;
  org_id: string;
  recipient_name: string;
  issued_on: string;
  expires_on: string | null;
  cert_hash: string | null;
  tx_hash: string | null;
  chain_id: number | null;
  status: "draft" | "issued" | "revoked";
  revoked_reason: string | null;
  course: { code: string; title: string } | null;
}

export async function getPublicCertificate(
  id: string,
): Promise<PublicCertificate | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("certificates")
    .select(
      `id, org_id, recipient_name, issued_on, expires_on, cert_hash, tx_hash,
       chain_id, status, revoked_reason,
       course:courses!certificates_course_id_fkey ( code, title )`,
    )
    .eq("id", id)
    .maybeSingle();

  return (data as unknown as PublicCertificate) ?? null;
}

/** Look up by hash — used by the PDF tamper check. */
export async function getPublicCertificateByHash(
  certHash: string,
): Promise<PublicCertificate | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("certificates")
    .select(
      `id, org_id, recipient_name, issued_on, expires_on, cert_hash, tx_hash,
       chain_id, status, revoked_reason,
       course:courses!certificates_course_id_fkey ( code, title )`,
    )
    .eq("cert_hash", certHash)
    .maybeSingle();

  return (data as unknown as PublicCertificate) ?? null;
}

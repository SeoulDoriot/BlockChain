import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { CertificateTemplate } from "@/lib/cert/template-layout";

/**
 * Certificate queries.
 *
 * Every select names its columns — never `*` — and relations are embedded in
 * the same round trip so a list of 20 certificates is one query, not 21.
 * Pagination is done in the database with `.range()`, never by fetching
 * everything and slicing in JavaScript.
 */

export interface CertificateRow {
  template_id: CertificateTemplate;
  certificate_title: string;
  description: string;
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
  signatory_name: string | null;
  signatory_title: string | null;
  signature_path: string | null;
  created_at: string;
  org_id: string;
  course: { id: string; code: string; title: string } | null;
  issuer: { id: string; full_name: string | null; email: string } | null;
}

const LIST_COLUMNS = `
  template_id, certificate_title, description,
  id, recipient_name, recipient_email, issued_on, expires_on,
  cert_hash, tx_hash, chain_id, pdf_path, status, revoked_reason,
  signatory_name, signatory_title, signature_path,
  created_at, org_id,
  course:courses!certificates_course_id_fkey ( id, code, title ),
  issuer:staff!certificates_issued_by_fkey ( id, full_name, email )
`;

/** Filter as the user sees it: expiry is derived, so it is matched on dates. */
export type StatusFilter = "active" | "expired" | "revoked" | "draft";
export type SortKey = "recent" | "name" | "issued" | "expires";

export interface ListOptions {
  page?: number;
  pageSize?: number;
  status?: "draft" | "issued" | "revoked";
  filter?: StatusFilter;
  sort?: SortKey;
  search?: string;
}

const today = () => new Date().toISOString().slice(0, 10);

/** Applies the user-facing status filter to a certificates query. */
function applyFilter<
  T extends {
    eq: (c: string, v: string) => T;
    or: (f: string) => T;
    lte: (c: string, v: string) => T;
  },
>(query: T, filter: StatusFilter | undefined): T {
  switch (filter) {
    case "revoked":
      return query.eq("status", "revoked");
    case "draft":
      return query.eq("status", "draft");
    case "active":
      return query
        .eq("status", "issued")
        .or(`expires_on.is.null,expires_on.gt.${today()}`);
    case "expired":
      return query.eq("status", "issued").lte("expires_on", today());
    default:
      return query;
  }
}

export interface CertificateCounts {
  total: number;
  active: number;
  expired: number;
  revoked: number;
}

/** Head-only count queries, run as the signed-in user so RLS scopes them. */
export async function getCertificateCounts(): Promise<CertificateCounts> {
  const supabase = await createClient();
  const count = async (filter?: StatusFilter) => {
    const base = supabase
      .from("certificates")
      .select("id", { count: "exact", head: true });
    const { count: n, error } = await applyFilter(base, filter);
    if (error) throw new Error(error.message);
    return n ?? 0;
  };

  const [total, active, expired, revoked] = await Promise.all([
    count(),
    count("active"),
    count("expired"),
    count("revoked"),
  ]);
  return { total, active, expired, revoked };
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
    .select(LIST_COLUMNS, { count: "exact" });

  switch (options.sort) {
    case "name":
      query = query.order("recipient_name", { ascending: true });
      break;
    case "issued":
      query = query.order("issued_on", { ascending: false });
      break;
    case "expires":
      query = query.order("expires_on", { ascending: true, nullsFirst: false });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }
  query = query.range(from, to);

  if (options.status) {
    query = query.eq("status", options.status);
  }
  query = applyFilter(query, options.filter);

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

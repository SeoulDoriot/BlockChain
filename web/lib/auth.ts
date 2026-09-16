import "server-only";

import { createClient } from "@/lib/supabase/server";

export type StaffRole = "admin" | "issuer" | "viewer";

export interface Org {
  id: string;
  slug: string;
  name: string;
}

export interface Staff {
  id: string;
  user_id: string;
  org_id: string;
  email: string;
  full_name: string | null;
  role: StaffRole;
}

export interface StaffContext {
  user: { id: string; email: string | null };
  staff: Staff;
  org: Org;
}

/** Thrown by requireStaff. `status` maps straight onto an HTTP response. */
export class AuthError extends Error {
  readonly status: 401 | 403;

  constructor(status: 401 | 403, message: string) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

/**
 * Resolve the signed-in member of staff, or throw.
 *
 * - 401 when nobody is signed in, or the token does not verify.
 * - 403 when the user is signed in but has no staff row — a real Supabase
 *   account that is not a member of any organisation.
 *
 * Authorisation is based on `getClaims()` (which verifies the JWT signature)
 * with `getUser()` as the source of the canonical user record. `getSession()`
 * is never used here: it reads the cookie without verifying it, so a forged
 * cookie would sail straight through.
 */
export async function requireStaff(): Promise<StaffContext> {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims) {
    throw new AuthError(401, "Not signed in.");
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new AuthError(401, "Not signed in.");
  }

  const { data: staff, error: staffError } = await supabase
    .from("staff")
    .select("id, user_id, org_id, email, full_name, role")
    .eq("user_id", user.id)
    .maybeSingle<Staff>();

  if (staffError) {
    throw new AuthError(403, "Could not load staff record.");
  }

  if (!staff) {
    throw new AuthError(403, "This account is not registered as staff.");
  }

  const { data: org, error: orgError } = await supabase
    .from("orgs")
    .select("id, slug, name")
    .eq("id", staff.org_id)
    .maybeSingle<Org>();

  if (orgError || !org) {
    throw new AuthError(403, "Staff record is not linked to an organisation.");
  }

  return {
    user: { id: user.id, email: user.email ?? null },
    staff,
    org,
  };
}

/** Narrow helper for routes that may only be used by an admin or issuer. */
export async function requireIssuer(): Promise<StaffContext> {
  const ctx = await requireStaff();

  if (ctx.staff.role !== "admin" && ctx.staff.role !== "issuer") {
    throw new AuthError(403, "Requires the admin or issuer role.");
  }

  return ctx;
}

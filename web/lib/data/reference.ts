import "server-only";

import { cacheTag, cacheLife } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Organisation and course lookups.
 *
 * These change roughly never, so they use the `reference` cacheLife profile
 * (revalidate daily). Tags let a course or org edit flush them immediately.
 */

export interface OrgSummary {
  id: string;
  slug: string;
  name: string;
}

export interface CourseSummary {
  id: string;
  code: string;
  title: string;
}

export async function getOrgBySlug(slug: string): Promise<OrgSummary | null> {
  "use cache";
  cacheTag(`org:${slug}`);
  cacheLife("reference");

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("orgs")
    .select("id, slug, name")
    .eq("slug", slug)
    .maybeSingle<OrgSummary>();

  return data ?? null;
}

export async function getOrgById(id: string): Promise<OrgSummary | null> {
  "use cache";
  cacheTag(`org-id:${id}`);
  cacheLife("reference");

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("orgs")
    .select("id, slug, name")
    .eq("id", id)
    .maybeSingle<OrgSummary>();

  return data ?? null;
}

export async function listCourses(orgId: string): Promise<CourseSummary[]> {
  "use cache";
  cacheTag(`courses:${orgId}`);
  cacheLife("reference");

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("courses")
    .select("id, code, title")
    .eq("org_id", orgId)
    .order("code");

  return data ?? [];
}

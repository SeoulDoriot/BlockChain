import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export interface CourseWithUsage {
  id: string;
  code: string;
  title: string;
  /** How many certificates (any status) reference this course. */
  certificates: number;
}

/**
 * Uncached on purpose: the management page must show a course the instant it
 * is created, and the usage counts decide whether it can be edited or removed.
 */
export async function listCoursesWithUsage(orgId: string): Promise<CourseWithUsage[]> {
  const supabase = createAdminClient();

  const [{ data: courses }, { data: used }] = await Promise.all([
    supabase.from("courses").select("id, code, title").eq("org_id", orgId).order("code"),
    supabase.from("certificates").select("course_id").eq("org_id", orgId),
  ]);

  const counts = new Map<string, number>();
  for (const row of used ?? []) {
    counts.set(row.course_id, (counts.get(row.course_id) ?? 0) + 1);
  }

  return (courses ?? []).map((course) => ({
    ...course,
    certificates: counts.get(course.id) ?? 0,
  }));
}

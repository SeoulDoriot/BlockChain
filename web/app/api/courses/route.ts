import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/api-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createCourseSchema } from "@/lib/schemas";
import { recordAudit } from "@/lib/audit";

/** Create a course. Admin only. */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  const { context } = auth;

  const parsed = createCourseSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid course.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("courses")
    .insert({ org_id: context.org.id, ...parsed.data })
    .select("id, code, title")
    .single();

  if (error) {
    // 23505 = unique_violation on (org_id, code)
    if (error.code === "23505") {
      return NextResponse.json(
        { error: `A course with the code ${parsed.data.code} already exists.` },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidateTag(`courses:${context.org.id}`, { expire: 0 });
  await recordAudit({
    orgId: context.org.id,
    actor: context.staff.id,
    action: "course.created",
    entity: "course",
    entityId: data.id,
    meta: parsed.data,
  });

  return NextResponse.json(data, { status: 201 });
}

import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/api-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateCourseSchema } from "@/lib/schemas";
import { recordAudit } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

async function usage(courseId: string): Promise<number> {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("certificates")
    .select("id", { count: "exact", head: true })
    .eq("course_id", courseId);
  return count ?? 0;
}

async function findCourse(id: string, orgId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("courses")
    .select("id, code, title")
    .eq("id", id)
    .eq("org_id", orgId)
    .maybeSingle<{ id: string; code: string; title: string }>();
  return data;
}

/** Rename a course, or change its code while nothing uses it. Admin only. */
export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  const { context } = auth;
  const { id } = await params;

  const parsed = updateCourseSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid course." },
      { status: 400 },
    );
  }

  const course = await findCourse(id, context.org.id);
  if (!course) return NextResponse.json({ error: "Course not found." }, { status: 404 });

  // The code is part of every certificate's hash. Changing it after issuing
  // would make those certificates stop verifying, so it is locked once used.
  if (parsed.data.code && parsed.data.code !== course.code) {
    const used = await usage(id);
    if (used > 0) {
      return NextResponse.json(
        {
          error: `The code can't change: ${used} certificate${used > 1 ? "s use" : " uses"} it. You can still rename the title.`,
        },
        { status: 409 },
      );
    }
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("courses")
    .update(parsed.data)
    .eq("id", id)
    .eq("org_id", context.org.id)
    .select("id, code, title")
    .single();

  if (error) {
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
    action: "course.updated",
    entity: "course",
    entityId: id,
    meta: { before: course, after: data },
  });

  return NextResponse.json(data);
}

/** Delete a course nobody has used. Admin only. */
export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  const { context } = auth;
  const { id } = await params;

  const course = await findCourse(id, context.org.id);
  if (!course) return NextResponse.json({ error: "Course not found." }, { status: 404 });

  const used = await usage(id);
  if (used > 0) {
    return NextResponse.json(
      {
        error: `This course has ${used} certificate${used > 1 ? "s" : ""}, so it can't be deleted.`,
      },
      { status: 409 },
    );
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("courses")
    .delete()
    .eq("id", id)
    .eq("org_id", context.org.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidateTag(`courses:${context.org.id}`, { expire: 0 });
  await recordAudit({
    orgId: context.org.id,
    actor: context.staff.id,
    action: "course.deleted",
    entity: "course",
    entityId: id,
    meta: course,
  });

  return NextResponse.json({ ok: true });
}

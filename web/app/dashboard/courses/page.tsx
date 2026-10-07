import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { listCoursesWithUsage } from "@/lib/data/courses";
import { CourseManager } from "@/components/course-manager";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Courses" };

/** Authenticated on every request, so this route is expected to block. */
export const instant = false;

export default async function CoursesPage() {
  const { org, staff } = await requireStaff();
  const courses = await listCoursesWithUsage(org.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Courses"
        description="The programs your organization issues certificates for. Each certificate belongs to one course."
      />
      <CourseManager courses={courses} canEdit={staff.role === "admin"} />
    </div>
  );
}

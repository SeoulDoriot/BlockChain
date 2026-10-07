import "server-only";

import { NextResponse } from "next/server";
import { AuthError, requireStaff, type StaffContext } from "@/lib/auth";

/**
 * Resolve the signed-in admin, or return the HTTP response to send back.
 * Courses and the signatory are organisation-wide settings, so only an admin
 * may change them (the database policies say the same).
 */
export async function requireAdmin(): Promise<
  { context: StaffContext } | { response: NextResponse }
> {
  try {
    const context = await requireStaff();
    if (context.staff.role !== "admin") {
      return {
        response: NextResponse.json(
          { error: "Only an admin can do this." },
          { status: 403 },
        ),
      };
    }
    return { context };
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        response: NextResponse.json({ error: error.message }, { status: error.status }),
      };
    }
    throw error;
  }
}

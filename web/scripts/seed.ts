/**
 * Seeds the KIT organisation, three courses, and links an admin staff row to
 * an existing Supabase auth user.
 *
 * The auth user must already exist — create it in the Supabase dashboard
 * (Authentication → Users) or by signing up through the app once. This script
 * only links it; it never creates accounts or handles passwords.
 *
 * Usage:
 *   npm run seed -- you@kit.edu.kh
 *   SEED_ADMIN_EMAIL=you@kit.edu.kh npm run seed
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in the environment, because it writes
 * rows that RLS would otherwise (correctly) refuse.
 */
import { createClient } from "@supabase/supabase-js";

const email = (process.argv[2] ?? process.env.SEED_ADMIN_EMAIL ?? "vy.seoul25@kit.edu.kh")
  .trim()
  .toLowerCase();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!email) {
  console.error(
    "No admin email given.\n" +
      "  npm run seed -- you@kit.edu.kh\n" +
      "or set SEED_ADMIN_EMAIL.",
  );
  process.exit(1);
}

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.\n" +
      "Copy .env.example to .env.local and fill it in.",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const COURSES = [
  { code: "CS101", title: "Introduction to Computer Science" },
  { code: "CS220", title: "Web Application Development" },
  { code: "CS340", title: "Blockchain and Distributed Systems" },
];

async function findAuthUserByEmail(target: string) {
  // listUsers is paginated; walk until we find the address or run out.
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw error;
    if (data.users.length === 0) return null;

    const match = data.users.find(
      (u) => u.email?.toLowerCase() === target,
    );
    if (match) return match;

    if (data.users.length < 200) return null;
  }
  return null;
}

async function main() {
  console.log(`Seeding for admin ${email} …`);

  // 1. organisation
  const { data: org, error: orgError } = await supabase
    .from("orgs")
    .upsert({ slug: "kit", name: "Kirirom Institute of Technology" }, {
      onConflict: "slug",
    })
    .select("id, slug, name")
    .single();

  if (orgError) throw orgError;
  console.log(`  org: ${org.name} (${org.id})`);

  // 2. courses
  const { data: courses, error: courseError } = await supabase
    .from("courses")
    .upsert(
      COURSES.map((c) => ({ ...c, org_id: org.id })),
      { onConflict: "org_id,code" },
    )
    .select("id, code, title");

  if (courseError) throw courseError;
  for (const c of courses ?? []) {
    console.log(`  course: ${c.code} — ${c.title}`);
  }

  // 3. link the admin staff row to the existing auth user
  const authUser = await findAuthUserByEmail(email);

  if (!authUser) {
    console.error(
      `\nNo Supabase auth user found with the email ${email}.\n` +
        `Create it first in the dashboard (Authentication → Users), then ` +
        `re-run this script.`,
    );
    process.exit(1);
  }

  const { data: staff, error: staffError } = await supabase
    .from("staff")
    .upsert(
      {
        user_id: authUser.id,
        org_id: org.id,
        email,
        full_name: authUser.user_metadata?.full_name ?? null,
        role: "admin",
      },
      { onConflict: "user_id" },
    )
    .select("id, email, role")
    .single();

  if (staffError) throw staffError;
  console.log(`  staff: ${staff.email} (${staff.role})`);

  console.log("\nDone.");
}

main().catch((error) => {
  console.error("\nSeed failed:", error.message ?? error);
  process.exit(1);
});

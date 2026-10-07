import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { SIGNATURE_MAX_BYTES, signatorySchema } from "@/lib/schemas";
import { signaturePath, uploadSignature } from "@/lib/cert/storage";
import { recordAudit } from "@/lib/audit";

/** The real type of an image, from its first bytes — never from its filename. */
function sniff(bytes: Uint8Array): "png" | "jpg" | null {
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  return null;
}

/**
 * Set who signs the organisation's certificates: name, title and an optional
 * signature image. Applies to certificates issued from now on. Admin only.
 */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  const { context } = auth;

  const form = await request.formData();
  const parsed = signatorySchema.safeParse({
    name: form.get("name"),
    title: form.get("title"),
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid details." },
      { status: 400 },
    );
  }

  const update: Record<string, string | null> = {
    signatory_name: parsed.data.name,
    signatory_title: parsed.data.title,
  };

  if (form.get("removeImage") === "1") update.signature_path = null;

  const file = form.get("image");
  if (file instanceof File && file.size > 0) {
    if (file.size > SIGNATURE_MAX_BYTES) {
      return NextResponse.json(
        { error: "The signature image must be under 400 KB." },
        { status: 400 },
      );
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const type = sniff(bytes);
    if (!type) {
      return NextResponse.json(
        { error: "Use a PNG or JPG image for the signature." },
        { status: 400 },
      );
    }
    // A new path each time: certificates already issued keep pointing at the
    // image they were signed with.
    const path = signaturePath(context.org.id, type);
    await uploadSignature(path, bytes, type === "png" ? "image/png" : "image/jpeg");
    update.signature_path = path;
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("orgs").update(update).eq("id", context.org.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordAudit({
    orgId: context.org.id,
    actor: context.staff.id,
    action: "org.signatory_updated",
    entity: "org",
    entityId: context.org.id,
    meta: { name: parsed.data.name, title: parsed.data.title, imageChanged: "signature_path" in update },
  });

  return NextResponse.json({ ok: true });
}

import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { downloadSignature } from "@/lib/cert/storage";

export interface Signatory {
  name: string | null;
  title: string | null;
  /** Storage path of the signature image, if one was uploaded. */
  path: string | null;
}

/** The organisation's current signatory. */
export async function getOrgSignatory(orgId: string): Promise<Signatory> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("orgs")
    .select("signatory_name, signatory_title, signature_path")
    .eq("id", orgId)
    .maybeSingle<{
      signatory_name: string | null;
      signatory_title: string | null;
      signature_path: string | null;
    }>();

  return {
    name: data?.signatory_name ?? null,
    title: data?.signatory_title ?? null,
    path: data?.signature_path ?? null,
  };
}

/** The signature as a data URL, for rendering in the on-screen preview. */
export async function signatureDataUrl(path: string | null): Promise<string | undefined> {
  if (!path) return undefined;
  const file = await downloadSignature(path);
  if (!file) return undefined;
  const mime = file.type === "png" ? "image/png" : "image/jpeg";
  return `data:${mime};base64,${Buffer.from(file.bytes).toString("base64")}`;
}

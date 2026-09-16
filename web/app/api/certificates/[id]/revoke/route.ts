import { NextResponse } from "next/server";
import type { Hex } from "viem";
import { loadCertificateForAction, errorResponse } from "@/lib/api";
import { revokeSchema } from "@/lib/schemas";
import { revokeCertificate } from "@/lib/cert/issue";

export const maxDuration = 60;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const loaded = await loadCertificateForAction(id);
  if (loaded instanceof NextResponse) return loaded;

  const { context, certificate } = loaded;

  if (certificate.status !== "issued") {
    return NextResponse.json(
      { error: `Only an issued certificate can be revoked (this one is ${certificate.status}).` },
      { status: 409 },
    );
  }

  if (!certificate.cert_hash) {
    return NextResponse.json(
      { error: "Certificate has no on-chain hash." },
      { status: 409 },
    );
  }

  const parsed = revokeSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid reason." },
      { status: 400 },
    );
  }

  try {
    const result = await revokeCertificate({
      certificateId: certificate.id,
      orgId: context.org.id,
      certHash: certificate.cert_hash as Hex,
      reason: parsed.data.reason,
      actorStaffId: context.staff.id,
    });
    return NextResponse.json({ ok: true, txHash: result.txHash });
  } catch (error) {
    return errorResponse(error);
  }
}

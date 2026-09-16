import { NextResponse } from "next/server";
import { AuthError, requireStaff } from "@/lib/auth";
import { grantIssuerSchema } from "@/lib/schemas";
import { grantIssuerRole } from "@/lib/chain/registry";
import { recordAudit } from "@/lib/audit";

export const maxDuration = 60;

/** Grant ISSUER_ROLE to another wallet. Admin only. */
export async function POST(request: Request) {
  let context;
  try {
    context = await requireStaff();
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  if (context.staff.role !== "admin") {
    return NextResponse.json(
      { error: "Only an admin can grant the issuer role." },
      { status: 403 },
    );
  }

  const parsed = grantIssuerSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid address." },
      { status: 400 },
    );
  }

  try {
    const txHash = await grantIssuerRole(parsed.data.address as `0x${string}`);

    await recordAudit({
      orgId: context.org.id,
      actor: context.staff.id,
      action: "issuer.granted",
      entity: "wallet",
      meta: { address: parsed.data.address, txHash },
    });

    return NextResponse.json({ ok: true, txHash });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}

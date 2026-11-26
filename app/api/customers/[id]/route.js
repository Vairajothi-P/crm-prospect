import { NextResponse } from "next/server";
import { deleteCrmRecord } from "@/lib/local-crm";

export async function DELETE(request, context) {
  const params = await context.params;
  const result = await deleteCrmRecord({
    table: "Customers",
    id: params.id,
    localFile: "local-customers.json",
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true, id: result.deletedId });
}

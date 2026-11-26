import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getLocalRecords, saveLocalLead, deleteCrmRecord } from "@/lib/local-crm";

export async function GET() {
  const leads = getLocalRecords("local-leads.json");
  return NextResponse.json(leads, { status: 200 });
}

export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  let id = searchParams.get("id");
  if (!id) {
    const body = await request.json().catch(() => ({}));
    id = body?.id;
  }
  const result = await deleteCrmRecord({
    table: "Leads",
    id,
    localFile: "local-leads.json",
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true, id: result.deletedId }, { status: 200 });
}

export async function POST(request) {
  const data = await request.json().catch(() => ({}));

  const newLead = {
    id: data.id || `lead_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: data.name || data.leadName || data.fullName || "New Prospect",
    email: data.email || "",
    number: data.number || data.phone || "",
    age: data.age || "",
    linkedIn: data.linkedIn || data.linkedinUrl || "",
    industry: data.industry || "",
    company: data.company || data.companyName || "",
    income: data.income || "",
    website: data.website || "",
    status: data.status || "New",
    source: data.source || data.leadSource || "PiBi Prospect AI",
    address: data.address || "",
    description: data.description || data.notes || "",
    user_email: data.session?.user?.email || data.user_email || "admin@pibi.io",
    created_at: new Date().toISOString(),
  };

  // Always save to persistent local-leads store so it is immediately visible in CRM Leads board
  saveLocalLead(newLead);

  // Also insert into Supabase if online
  try {
    const supabase = await createClient();
    const { data: dbLead, error } = await supabase
      .from("Leads")
      .insert(newLead)
      .select("*")
      .single();

    if (!error && dbLead) {
      return NextResponse.json(dbLead, { status: 200 });
    }
  } catch (err) {
    // Supabase offline/error handled gracefully by local-leads persistence
  }

  return NextResponse.json(newLead, { status: 200 });
}

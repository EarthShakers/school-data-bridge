import { NextResponse } from "next/server";
import { metadataDb } from "@/src/utils/metadataDb";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenantId");

  try {
    const row = await metadataDb("bridge_tenants").where({ tenant_id: tenantId }).first();
    if (row) {
      return NextResponse.json({
        tenantId: row.tenant_id,
        schoolName: row.school_name,
        status: row.status,
        commonConfig: row.common_config,
      });
    }
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    await metadataDb("bridge_tenants")
      .insert({
        tenant_id: data.tenantId,
        school_name: data.schoolName,
        status: data.status,
        common_config: JSON.stringify(data.commonConfig || {}),
      })
      .onConflict("tenant_id")
      .merge();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

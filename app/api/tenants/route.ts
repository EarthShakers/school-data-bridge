import { NextResponse } from "next/server";
import { getAvailableTenants, getAvailableEntities } from "@/src/mapping/localAdapter";

export async function GET() {
  try {
    const tenantIds = getAvailableTenants();
    const tenants = tenantIds.map((tenantId) => ({
      tenantId,
      entities: getAvailableEntities(tenantId),
    }));

    return NextResponse.json({ tenants });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


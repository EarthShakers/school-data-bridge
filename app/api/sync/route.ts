import { NextResponse } from "next/server";
import { addSyncJob } from "@/src/queue/syncQueue";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { tenantId, entityType, environment } = await request.json();
    console.log(
      `[API] Triggering sync for ${tenantId}:${entityType} in ${environment}`
    );

    if (!tenantId || !entityType || !environment) {
      return NextResponse.json(
        { success: false, message: "参数缺失 (tenantId, entityType, environment)" },
        { status: 400 }
      );
    }

    await addSyncJob(tenantId, entityType, environment);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[API Sync Error]", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}


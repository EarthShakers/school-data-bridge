import { NextResponse } from "next/server";
import { addSyncJob } from "@/src/queue/syncQueue";

export async function POST(request: Request) {
  try {
    const { tenantId, entityType } = await request.json();
    console.log(`[API] Triggering sync for ${tenantId}:${entityType}`);

    if (!tenantId || !entityType) {
      return NextResponse.json({ success: false, message: "参数缺失" }, { status: 400 });
    }

    await addSyncJob(tenantId, entityType);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[API Sync Error]", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}


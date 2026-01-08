import { NextResponse } from "next/server";
import { addSyncJob } from "@/src/queue/syncQueue";
import { saveImportResultToDb } from "@/src/utils/dbLogger";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { tenantId, entityType, environment } = await request.json();
    const traceId = `task_${Date.now()}`;

    console.log(
      `[API] Triggering sync for ${tenantId}:${entityType} in ${environment} (TraceId: ${traceId})`
    );

    if (!tenantId || !entityType || !environment) {
      return NextResponse.json(
        { success: false, message: "参数缺失 (tenantId, entityType, environment)" },
        { status: 400 }
      );
    }

    // --- 关键：在进入队列前，先在 DB 占位，状态设为等待中 ---
    await saveImportResultToDb(tenantId, entityType, traceId, [], {
      fetch: { total: 0, status: "queued" },
      transform: { success: 0, failed: 0 },
      write: { success: 0, failed: 0 },
    });

    await addSyncJob(tenantId, entityType, environment, 10, traceId);

    return NextResponse.json({ success: true, traceId });
  } catch (error: any) {
    console.error("[API Sync Error]", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}


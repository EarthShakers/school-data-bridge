import { NextResponse } from "next/server";
import { syncQueue } from "@/src/queue/syncQueue";

export const dynamic = "force-dynamic";

export async function GET() {
  console.log("[API Tasks] 🔍 Start fetching tasks...");
  try {
    // 使用 getJobCounts 一次性获取所有状态的计数
    console.log("[API Tasks] 📊 Fetching counts...");
    const counts = await syncQueue.getJobCounts(
      "waiting",
      "active",
      "completed",
      "failed",
      "delayed",
      "paused"
    );

    // 获取任务：增加到 100 条，包含所有可能的状态，且使用倒序 (asc: false)
    console.log("[API Tasks] 📋 Fetching jobs...");
    const jobs = await syncQueue.getJobs(
      ["active", "waiting", "completed", "failed", "delayed", "paused"],
      0,
      99,
      false // asc: false 表示最新的在前 (倒序)
    );

    console.log(
      `[API Tasks] 🚀 Found ${jobs.length} jobs, processing states...`
    );
    const jobList = await Promise.all(
      jobs.map(async (job) => {
        // 这里的 getState 是必要的，因为 getJobs 返回的是任务快照，状态可能已变更
        const status = await job.getState();
        return {
          id: job.id,
          name: job.name,
          data: job.data,
          status: status,
          progress: job.progress,
          timestamp: job.timestamp,
          finishedOn: job.finishedOn,
          failedReason: job.failedReason,
        };
      })
    );

    console.log("[API Tasks] ✅ Done.");
    return NextResponse.json({
      counts,
      jobs: jobList,
    });
  } catch (error: any) {
    console.error("[API Tasks Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

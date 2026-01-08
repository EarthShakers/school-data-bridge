import { NextResponse } from "next/server";
import { getSystemEnvironments } from "@/src/saveData/config";
import { metadataDb } from "@/src/utils/metadataDb";

export async function GET() {
  const envs = await getSystemEnvironments();
  return NextResponse.json({ environments: envs });
}

export async function POST(request: Request) {
  try {
    const { environments } = await request.json();

    if (!Array.isArray(environments)) {
      return NextResponse.json(
        { error: "Environments must be an array" },
        { status: 400 }
      );
    }

    // 数据库驱动：使用事务更新环境配置
    await metadataDb.transaction(async (trx) => {
      // 1. 清空旧数据
      await trx("bridge_system_environments").del();
      // 2. 插入新数据
      if (environments.length > 0) {
        await trx("bridge_system_environments").insert(
          environments.map((e: any) => ({
            id: e.id,
            name: e.name,
            url: e.url,
          }))
        );
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[API System Config POST Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

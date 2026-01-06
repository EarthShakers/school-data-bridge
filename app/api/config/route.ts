import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const CONFIG_BASE_PATH = path.join(process.cwd(), "config", "schools");

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenantId");
  const entityType = searchParams.get("entityType");

  if (!tenantId || !entityType) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const configPath = path.join(CONFIG_BASE_PATH, tenantId, `${entityType}.json5`);

  if (!fs.existsSync(configPath)) {
    // 如果文件不存在，返回默认模板，而不是报错
    const defaultTemplate = {
      tenantId,
      schoolName: "待配置租户",
      entityType,
      dataSource: {
        type: "api",
        config: {
          url: `https://api.example.com/${entityType}`,
          method: "GET",
          params: {},
          pagination: { pageParam: "page", sizeParam: "size", pageSize: 100 }
        }
      },
      fieldMap: [{ sourceField: "id", targetField: "id", label: "ID" }],
      batchConfig: { batchSize: 100, retryTimes: 3 },
      syncConfig: { enabled: false, cron: "0 0 * * *" }
    };
    return NextResponse.json({ content: JSON.stringify(defaultTemplate, null, 2) });
  }

  try {
    const content = fs.readFileSync(configPath, "utf-8");
    return NextResponse.json({ content });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { tenantId, entityType, content } = await request.json();

    if (!tenantId || !entityType || content === undefined) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const tenantPath = path.join(CONFIG_BASE_PATH, tenantId);
    if (!fs.existsSync(tenantPath)) {
      fs.mkdirSync(tenantPath, { recursive: true });
    }

    const configPath = path.join(tenantPath, `${entityType}.json5`);
    
    // 如果 content 为空字符串且文件不存在，可以初始化一个模板
    let finalContent = content;
    if (!content && !fs.existsSync(configPath)) {
      finalContent = JSON.stringify({
        tenantId,
        schoolName: "新租户",
        entityType,
        dataSource: {
          type: "api",
          config: {
            url: "https://api.example.com/data",
            method: "GET",
            params: {},
            pagination: { pageParam: "page", sizeParam: "size", pageSize: 100 }
          }
        },
        fieldMap: [
          { sourceField: "id", targetField: "id", label: "ID" }
        ],
        batchConfig: { batchSize: 100, retryTimes: 3 },
        syncConfig: { enabled: false, cron: "0 0 * * *" }
      }, null, 2);
    }

    fs.writeFileSync(configPath, finalContent, "utf-8");

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


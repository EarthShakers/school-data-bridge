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
    return NextResponse.json({ error: "Config not found" }, { status: 404 });
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
    fs.writeFileSync(configPath, content, "utf-8");

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


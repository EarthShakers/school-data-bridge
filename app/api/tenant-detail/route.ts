import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const CONFIG_BASE_PATH = path.join(process.cwd(), "config", "schools");

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenantId");

  if (!tenantId) return NextResponse.json({ error: "Missing tenantId" }, { status: 400 });

  const configPath = path.join(CONFIG_BASE_PATH, tenantId, "tenantConfig.json5");
  
  try {
    if (!fs.existsSync(configPath)) {
      return NextResponse.json({ error: "Tenant config not found" }, { status: 404 });
    }
    const content = fs.readFileSync(configPath, "utf-8");
    return NextResponse.json(JSON.parse(content));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const config = await request.json();
    const { tenantId } = config;

    if (!tenantId) return NextResponse.json({ error: "Missing tenantId" }, { status: 400 });

    const configPath = path.join(CONFIG_BASE_PATH, tenantId, "tenantConfig.json5");
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


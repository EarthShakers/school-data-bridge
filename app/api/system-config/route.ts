import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getSystemEnvironments } from "@/src/saveData/config";

const SYSTEM_CONFIG_PATH = path.join(process.cwd(), "config", "systemConfig.json5");

export async function GET() {
  const envs = getSystemEnvironments();
  return NextResponse.json({ environments: envs });
}

export async function POST(request: Request) {
  try {
    const { environments } = await request.json();
    
    if (!Array.isArray(environments)) {
      return NextResponse.json({ error: "Environments must be an array" }, { status: 400 });
    }

    const dir = path.dirname(SYSTEM_CONFIG_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(SYSTEM_CONFIG_PATH, JSON.stringify({ environments }, null, 2), "utf-8");

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

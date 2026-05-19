import { NextResponse } from "next/server";
import { detectCorners } from "@/lib/scanner";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    
    const buffer = Buffer.from(await file.arrayBuffer());
    const corners = await detectCorners(buffer);
    
    return NextResponse.json({ corners });
  } catch (err) {
    console.error("Corner detection failed:", err);
    return NextResponse.json({ error: "Detection failed" }, { status: 500 });
  }
}

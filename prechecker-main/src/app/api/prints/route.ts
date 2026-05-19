/**
 * Stage 2 printed-carton endpoints.
 *
 *  POST /api/prints     upload printed carton photo for an artwork
 *  GET  /api/prints     list print jobs
 */
import { NextResponse } from "next/server";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { ensureDir, printDir, safeExt, writeBytes, toPublicUrl } from "@/lib/storage";
import { CAN_UPLOAD_PRINT, hasRole } from "@/lib/roles";
import { perspectiveWarp } from "@/lib/scanner";
import sharp from "sharp";

export async function GET() {
  const res = await requireSession();
  if ("error" in res) return res.error;
  const prints = await prisma.printJob.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      artwork: { select: { id: true, title: true } },
      uploadedBy: { select: { id: true, name: true, email: true } },
    },
    take: 200,
  });
  return NextResponse.json({ prints });
}

export async function POST(req: Request) {
  const res = await requireSession();
  if ("error" in res) return res.error;
  if (!hasRole(res.session.user.role, CAN_UPLOAD_PRINT)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const form = await req.formData();
  const file = form.get("file");
  const artworkId = (form.get("artworkId") as string | null) ?? "";
  const cornersStr = form.get("corners") as string | null;
  
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }
  const artwork = await prisma.artwork.findUnique({ where: { id: artworkId } });
  if (!artwork) return NextResponse.json({ error: "Unknown artworkId" }, { status: 400 });
  if (artwork.status !== "APPROVED") {
    return NextResponse.json(
      { error: "Artwork must be APPROVED before you can upload a printed carton." },
      { status: 409 },
    );
  }
  const job = await prisma.printJob.create({
    data: {
      artworkId: artwork.id,
      originalPath: "",
      uploadedById: res.session.user.id,
    },
  });
  
  let buffer: any = Buffer.from(await file.arrayBuffer());
  let ext = safeExt(file.name, "jpg");

  if (cornersStr) {
    try {
      const corners = JSON.parse(cornersStr);
      if (Array.isArray(corners) && corners.length === 4) {
        const meta = await sharp(buffer).rotate().metadata();
        console.log(`[api/prints] Print dimensions: ${meta.width}x${meta.height}`);
        
        let targetW: number | undefined;
        let targetH: number | undefined;

        if (artwork.normalizedPath) {
          const artMeta = await sharp(artwork.normalizedPath).metadata();
          console.log(`[api/prints] Artwork dimensions: ${artMeta.width}x${artMeta.height}`);
          targetW = artwork.printableW ?? artMeta.width;
          targetH = artwork.printableH ?? artMeta.height;
        }
        
        // Use artwork's true aspect ratio (printable area if available, else full frame)
        buffer = await perspectiveWarp(buffer, corners, targetW, targetH);
        ext = "png";
      }
    } catch (err) {
      console.error("Failed to apply perspective warp:", err);
    }
  }

  const dir = printDir(job.id);
  await ensureDir(dir);
  const abs = path.join(dir, `original.${ext}`);
  await writeBytes(abs, buffer as any);

  const updated = await prisma.printJob.update({
    where: { id: job.id },
    data: { originalPath: abs },
  });
  return NextResponse.json({
    print: { ...updated, originalUrl: toPublicUrl(abs) },
  });
}

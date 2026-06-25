import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { toPublicUrl } from "@/lib/storage";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const res = await requireSession();
  if ("error" in res) return res.error;
  const { id } = await ctx.params;
  const job = await prisma.printJob.findUnique({
    where: { id },
    include: {
      artwork: {
        select: { id: true, title: true, normalizedPath: true, originalPath: true },
      },
      uploadedBy: { select: { id: true, name: true, email: true } },
      alerts: true,
    },
  });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    print: {
      ...job,
      originalUrl: job.originalPath ? toPublicUrl(job.originalPath) : null,
      alignedUrl: job.alignedPath ? toPublicUrl(job.alignedPath) : null,
      diffUrl: job.diffPath ? toPublicUrl(job.diffPath) : null,
      artwork: job.artwork
        ? {
            ...job.artwork,
            normalizedUrl: job.artwork.normalizedPath
              ? toPublicUrl(job.artwork.normalizedPath)
              : null,
          }
        : null,
    },
  });
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const res = await requireSession();
  if ("error" in res) return res.error;
  
  const { CAN_UPLOAD_PRINT, hasRole } = await import("@/lib/roles");
  if (!hasRole(res.session.user.role, CAN_UPLOAD_PRINT)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const decision = body?.decision; // "ACCEPT" | "REJECT"

  if (decision !== "ACCEPT" && decision !== "REJECT") {
    return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
  }

  const job = await prisma.printJob.findUnique({
    where: { id },
  });
  if (!job) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let statusReason = job.statusReason ?? "";
  // Strip off previous override prefixes if any to avoid stacking prefixes
  if (statusReason.startsWith("Approved by inspector override.")) {
    statusReason = statusReason.replace("Approved by inspector override. Original: ", "").replace("Approved by inspector override.", "");
  } else if (statusReason.startsWith("Rejected by inspector override.")) {
    statusReason = statusReason.replace("Rejected by inspector override. Original: ", "").replace("Rejected by inspector override.", "");
  }

  if (decision === "ACCEPT") {
    statusReason = statusReason 
      ? `Approved by inspector override. Original: ${statusReason}`
      : `Approved by inspector override.`;
  } else {
    statusReason = statusReason 
      ? `Rejected by inspector override. Original: ${statusReason}`
      : `Rejected by inspector override.`;
  }

  const updated = await prisma.printJob.update({
    where: { id },
    data: {
      status: decision === "ACCEPT" ? "MATCH" : (job.verdict === "ALIGNMENT_UNCERTAIN" ? "ALIGNMENT_UNCERTAIN" : "MISMATCH"),
      statusReason,
    },
  });

  return NextResponse.json({ print: updated });
}


import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeArtwork } from "@/lib/image";
import { recognizeWords } from "@/lib/ocr";
import path from "node:path";

export async function GET() {
  try {
    const artwork = await prisma.artwork.findFirst({
      where: { status: 'PENDING_OCR' },
    });
    if (!artwork) return NextResponse.json({ error: "No pending artwork" });

    const dir = path.dirname(artwork.originalPath);
    const normalized = path.join(dir, "normalized.png");

    console.log("Normalizing...");
    await normalizeArtwork(artwork.originalPath, normalized);
    
    console.log("Recognizing...");
    const words = await recognizeWords(normalized);
    
    return NextResponse.json({ success: true, wordsCount: words.length });
  } catch (err) {
    console.error("Test OCR Error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

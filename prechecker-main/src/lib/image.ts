import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";

const MAX_DIM = 2400;

export async function normalizeArtwork(inputPath: string, outputPath: string): Promise<void> {
  console.log(`[image] normalizeArtwork started: ${inputPath}`);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  let imgBuffer: Buffer | string = inputPath;

  if (inputPath.toLowerCase().endsWith(".pdf")) {
    console.log("[image] Converting PDF artwork to PNG via pdfjs-dist...");
    try {
      const { createCanvas, Image } = await import("canvas");
      if (typeof global !== 'undefined' && !(global as any).Image) {
        (global as any).Image = Image;
      }
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const data = new Uint8Array(await fs.readFile(inputPath));
      const loadingTask = pdfjs.getDocument({
        data,
        disableWorker: true,
        verbosity: 0,
      } as any);
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = createCanvas(viewport.width, viewport.height);
      const context = canvas.getContext("2d");
      await page.render({
        canvasContext: context as any,
        viewport,
      }).promise;
      imgBuffer = canvas.toBuffer("image/png");
      await pdf.destroy();
    } catch (err) {
      console.error("[image] PDF conversion failed:", err);
      throw new Error(`Failed to process PDF: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  console.log("[image] Processing with sharp...");
  // To get the dimensions of the ROTATED image reliably, we render it to a buffer first.
  const rotated = await sharp(imgBuffer, { failOn: "none" }).rotate().toBuffer({ resolveWithObject: true });
  const { data, info } = rotated;
  
  const w = info.width;
  const h = info.height;
  
  if (!w || !h) {
    throw new Error("Unable to read image dimensions — ensure the file is a raster image (PNG/JPG) or a valid PDF.");
  }
  
  const scale = Math.min(1, MAX_DIM / Math.max(w, h));
  const finalW = Math.round(w * scale);
  const finalH = Math.round(h * scale);
  console.log(`[image] Final resize: ${w}x${h} -> ${finalW}x${finalH}`);
  
  await sharp(data)
    .resize(finalW, finalH, { fit: "inside" })
    .flatten({ background: "#ffffff" })
    .png()
    .toFile(outputPath);
    
  console.log(`[image] normalizeArtwork finished: ${outputPath}`);
}

import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";

export type Point = { x: number; y: number };

const WORKER = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "cv-worker.mjs"
);

function runWorker<T>(args: object): Promise<T> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [WORKER, JSON.stringify(args)], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => { out += d.toString(); });
    child.stderr.on("data", (d) => { 
      const msg = d.toString();
      err += msg;
      process.stderr.write(msg);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`cv-worker exited with ${code}: ${err}`));
        return;
      }
      try {
        resolve(JSON.parse(out) as T);
      } catch (e) {
        reject(new Error(`cv-worker non-JSON: ${out}`));
      }
    });
  });
}

export async function perspectiveWarp(
  imageBuffer: Buffer, 
  corners: Point[], 
  targetWidth?: number, 
  targetHeight?: number
): Promise<Buffer> {
  const id = randomBytes(8).toString("hex");
  const tempIn = path.join(tmpdir(), `carton-warp-${id}-in.png`);
  const tempOut = path.join(tmpdir(), `carton-warp-${id}-out.png`);
  
  await fs.writeFile(tempIn, imageBuffer);
  
  try {
    await runWorker({
      mode: "perspective-warp",
      imagePath: tempIn,
      outputPath: tempOut,
      corners,
      targetWidth,
      targetHeight
    });
    
    const result = await fs.readFile(tempOut);
    return result;
  } finally {
    await fs.unlink(tempIn).catch(() => {});
    await fs.unlink(tempOut).catch(() => {});
  }
}

export async function detectCorners(imageBuffer: Buffer): Promise<Point[]> {
  const id = randomBytes(8).toString("hex");
  const tempIn = path.join(tmpdir(), `carton-detect-${id}-in.png`);
  await fs.writeFile(tempIn, imageBuffer);
  
  try {
    const result = await runWorker<{ corners: Point[] }>({
      mode: "detect-corners",
      imagePath: tempIn
    });
    return result.corners;
  } finally {
    await fs.unlink(tempIn).catch(() => {});
  }
}

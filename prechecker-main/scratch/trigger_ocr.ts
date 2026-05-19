import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
p.artwork.findFirst({ where: { status: 'PENDING_OCR' } }).then(async (a) => {
  if (!a) {
    console.log("No pending artwork found. Fetching the last uploaded artwork.");
    const last = await p.artwork.findFirst({ orderBy: { createdAt: 'desc' }});
    if (!last) return;
    a = last;
  }
  console.log("Triggering OCR for", a.id);
  const res = await fetch(`http://localhost:3000/api/artwork/${a.id}/ocr`, { method: "POST" });
  console.log("Status:", res.status);
  console.log("Response:", await res.text());
}).finally(() => {
  p.$disconnect();
});

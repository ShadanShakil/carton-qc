const { createCanvas } = require('canvas');
const fs = require('node:fs');

try {
  console.log("Creating canvas...");
  const canvas = createCanvas(200, 200);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = "red";
  ctx.fillRect(0, 0, 100, 100);
  const buf = canvas.toBuffer();
  fs.writeFileSync('scratch/test_canvas.png', buf);
  console.log("Canvas SUCCESS: saved scratch/test_canvas.png");
} catch (err) {
  console.error("Canvas FAILURE:", err);
}

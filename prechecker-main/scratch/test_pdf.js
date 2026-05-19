const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
const { createCanvas } = require('canvas');

async function test() {
  try {
    console.log("Loading PDFjs...");
    // Mocking a PDF or using a real one if available.
    // For now, just seeing if the imports work and if we can call a function.
    console.log("PDFjs version:", pdfjs.version);
    console.log("Canvas version:", require('canvas/package.json').version);
    
    console.log("SUCCESS: Imports work.");
  } catch (err) {
    console.error("FAILURE:", err);
    process.exit(1);
  }
}

test();

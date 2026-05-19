import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import pkg from 'canvas';
const { createCanvas } = pkg;

async function test() {
  try {
    console.log("Loading PDFjs...");
    console.log("PDFjs version:", pdfjs.version);
    console.log("Canvas is loaded");
    
    console.log("SUCCESS: Imports work.");
  } catch (err) {
    console.error("FAILURE:", err);
    process.exit(1);
  }
}

test();

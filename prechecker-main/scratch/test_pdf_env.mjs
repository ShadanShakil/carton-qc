import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import pkg from 'canvas';
const { createCanvas } = pkg;
import fs from 'node:fs/promises';

async function test() {
  try {
    console.log("Loading PDFjs...");
    // Just testing the initialization
    const data = new Uint8Array(100); // Dummy data
    try {
      const loadingTask = pdfjs.getDocument({
        data,
        disableWorker: true,
        verbosity: 0,
      });
      await loadingTask.promise;
    } catch (e) {
      // Expecting an error because data is dummy, but we want to see if getDocument works
      console.log("getDocument called, error as expected:", e.message);
    }
    
    console.log("Creating canvas...");
    const canvas = createCanvas(100, 100);
    console.log("Canvas created");
    
    console.log("SUCCESS: Environment is ready.");
  } catch (err) {
    console.error("FAILURE:", err);
    process.exit(1);
  }
}

test();

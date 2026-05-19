const sharp = require('sharp');

async function test() {
  try {
    console.log("Checking sharp formats...");
    console.log(sharp.format);
    if (sharp.format.pdf) {
      console.log("SUCCESS: Sharp supports PDF!");
    } else {
      console.log("FAILURE: Sharp does NOT support PDF.");
    }
  } catch (err) {
    console.error(err);
  }
}

test();

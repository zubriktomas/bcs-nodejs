/**
 * Project: Box Clustering Segmentation in Node.js
 * Author: Tomas Zubrik, xzubri00@stud.fit.vutbr.cz
 * Year: 2021
 * License:  GNU GPLv3
 */

// Import puppeteer (ES6 standard modules import)
const puppeteer = require('puppeteer');

// Main process
(async () => { 
  
  // Create browser instance
  const browser = await puppeteer.launch();
  
  // Open new page in browser
  const page = await browser.newPage();

  // Set viewport of browser to specific values
  await page.setViewport({
    width: 1000,
    height: 600
  });

  // Load webpage for segmentation process given by input argument
  await page.goto('https://en.wikipedia.org/wiki/Coronavirus', {waitUntil: 'networkidle2'});

  // Add JavaScript files into webpage for execution and processing in browser context
  await page.addScriptTag({ path: './src/helper-functions.js'});
  await page.addScriptTag({ path: './src/box-extraction.js'});
  await page.addScriptTag({ url: 'https://unpkg.com/fast-average-color/dist/index.min.js'});

  // Box Extraction Process - JavaScript code evaluated in web browser context
  const boxes = await page.evaluate(async () => {

    const textNodes = extractTextNodes(document);
    const imageNodes = await extractImageNodes(document);

    return {
      textNodes: textNodes, 
      imageNodes:  imageNodes,
      document: {
        height: document.body.scrollHeight, 
        width: document.body.scrollWidth 
      }
    };

  });

  // Capture screenshot of webpage in PNG format
  await page.screenshot({ path: './output/webpage.png', fullPage: true });

  // Capture screenshot of webpage in PDF format
  // await page.emulateMediaType('screen');
  // await page.pdf({path:'./output/webpage.pdf', fullPage:true});

  // Close browser instance (no longer needed)
  await browser.close();

  // Extracted boxes can be used in next processing step
  console.log(boxes);
  
  // BCS has finished successfully!
  console.log("BCS has finished successfully!");

})();

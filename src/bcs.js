/**
 * Project: Box Clustering Segmentation in Node.js
 * Author: Tomas Zubrik, xzubri00@stud.fit.vutbr.cz
 * Year: 2021
 * License:  GNU GPLv3
 * Description: Main function program block
 */

// Import webpage box creator
const webPageCreator = require('./create-web-page');

// Import playwright
const { chromium } = require('playwright');

// Main process
(async () => { 
  
  // Create browser instance
  const browser = await chromium.launch();
  
  // Open new page in browser
  const page = await browser.newPage();

  page.setViewportSize({
    width: 1000,
    height: 600
  });

  // Load webpage for segmentation process given by input argument
  // await page.goto('http://localhost:8080/one-child-nodes.html', {waitUntil: 'networkidle2'});
  // await page.goto('https://en.wikipedia.org/wiki/Coronavirus', {waitUntil: 'domcontentloaded'});
  await page.goto('http://localhost:8080/one-child-nodes.html', {waitUntil: 'domcontentloaded'});

  // Add JavaScript files into webpage for execution and processing in browser context
  await page.addScriptTag({ path: './src/helper-functions.js'});
  await page.addScriptTag({ path: './src/node-extraction.js'});
  await page.addScriptTag({ path: './src/box-extraction.js'});
  await page.addScriptTag({ url: 'https://unpkg.com/fast-average-color/dist/index.min.js'});

  // Box Extraction Process - JavaScript code evaluated in web browser context
  const boxes = await page.evaluate(async () => {

    var t0 = performance.now()
    var boxes = extractBoxes();
    var t1 = performance.now()

    return {
      boxes: boxes,
      document: {
        height: document.body.scrollHeight, 
        width: document.body.scrollWidth 
      }, 
      time: "Call to doSomething took " + (t1 - t0) + " milliseconds."
    };

  });

  // Capture screenshot of webpage in PNG format
  await page.screenshot({ path: './output/webpage.png', fullPage: true });

  // Capture screenshot of webpage in PDF format
  // await page.emulateMedia({media:"screen"});
  // await page.pdf({path:'./output/webpage.pdf', fullPage:true});

  // Close browser instance (no longer needed)
  await browser.close();

  // Extracted boxes can be used in next processing step
  console.log(boxes);

  // Visualize box tree representation of webpage and take screenshot
  webPageCreator.runServer(boxes);
  
  // BCS has finished successfully!
  console.log("BCS has finished successfully!");

})();

/**
 * Project: Box Clustering Segmentation in Node.js
 * Author: Tomas Zubrik, xzubri00@stud.fit.vutbr.cz
 * Year: 2021
 * License:  GNU GPLv3
 * Description: Main function program block
 */

// Import box vizualizer
const vizualizer = require('./modules/box-vizualizer');

// Import clustering module
const clustering = require('./modules/clustering');

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
  await page.goto('https://en.wikipedia.org/wiki/Dyslalia', {waitUntil: 'domcontentloaded'});
  // await page.goto('https://en.wikipedia.org/wiki/Coronavirus', {waitUntil: 'domcontentloaded'});
  // await page.goto('http://localhost:8080/one-child-nodes.html', {waitUntil: 'domcontentloaded'});
  // await page.goto('http://localhost:8080/5colordivs.html', {waitUntil: 'domcontentloaded'});
  // await page.goto('https://en.wikipedia.org/wiki/Goods_and_services', {waitUntil: 'domcontentloaded'});
  // await page.goto('http://localhost:8080/1.html', {waitUntil: 'domcontentloaded'});
  // await page.goto('http://localhost:8080/1_no_conflict.html', {waitUntil: 'domcontentloaded'});
  // await page.goto('http://localhost:8080/2_overlaps_box.html', {waitUntil: 'domcontentloaded'});
  // await page.goto('http://localhost:8080/4_contains_box.html', {waitUntil: 'domcontentloaded'});


  // Add JavaScript files into webpage for execution and processing in browser context
  await page.addScriptTag({ path: './src/structures/Box.js'});
  await page.addScriptTag({ path: './src/modules/box-extraction.js'});
  await page.addScriptTag({ url: 'https://unpkg.com/fast-average-color/dist/index.min.js'});

  // Box Extraction Process - JavaScript code evaluated in web browser context
  const extracted = await page.evaluate(async () => {

    const t0 = performance.now();
    const boxes = await extractBoxes(document.body);
    const t1 = performance.now();

    return {
      boxes: boxes,
      document: {
        height: document.body.scrollHeight,
        width: document.body.scrollWidth
      },
      time: t1-t0
    };
  });

  /* Capture screenshot of webpage in PNG format */
  await page.screenshot({ path: './output/webpage.png', fullPage: true });

  /* Close browser instance (no longer needed) */
  await browser.close();

  // console.log("Extraction time:", extracted.time, "ms");

  /* Start Clustering Process */
  clustering.process(extracted);

  /* Visualize box tree representation of webpage and take screenshot */
  // vizualizer.createSvgRepresentation(extracted);

  // BCS has finished successfully!
  // console.log("BCS has finished successfully!");

})();

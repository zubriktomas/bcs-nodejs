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


const argv = require('yargs/yargs')(process.argv.slice(2))
  .usage('Usage: $0 [options] <url>')
	.example('$0 -W 1200 -H 800 http://cssbox.sf.net', '')
	.strictOptions(true)
    .alias('CT', 'clustering-threshold')
      .nargs('CT', 1)
      .default('CT', 0.5)
      .describe('CT', 'Clustering Threshold')
    .alias('W', 'width')
      .nargs('W', 1)
      .default('W', 1200)
      .describe('W', 'Browser viewport width')
    .alias('H', 'height')
      .nargs('H', 1)
      .default('H', 800)
      .describe('H', 'Browser viewport height')
	  .alias('S', 'save-screenshot')
      .boolean('S').default('S', true)
      .describe('S', 'Save screenshot of rendered page')
    .help('h').alias('h', 'help')
    .argv;

if (argv._.length !== 1) {
	process.stderr.write('<url> is required. Use -h for help.\n');
	process.exit(1);
}

const url = argv._[0];
const viewportWidth = argv.width;
const viewportHeight = argv.height;
const clusteringThreshold = argv.CT;

// Main process
(async () => {

  // Create browser instance
  const browser = await chromium.launch();

  // Open new page in browser
  const page = await browser.newPage();

  page.setViewportSize({
    width: viewportWidth,
    height: viewportHeight
  });

  // Load webpage for segmentation process given by input argument
  try {
    // await page.goto(url);
    await page.goto('http://cssbox.sf.net');
    // await page.goto('https://en.wikipedia.org/wiki/Dyslalia', {waitUntil: 'domcontentloaded'});
    // await page.goto('https://en.wikipedia.org/wiki/Coronavirus', {waitUntil: 'domcontentloaded'});
    // await page.goto('http://localhost:8080/5colordivs.html', {waitUntil: 'domcontentloaded'});
    // await page.goto('https://en.wikipedia.org/wiki/Goods_and_services', {waitUntil: 'domcontentloaded'});
  } catch (error) {
    console.log(error.message);
    process.exit(1);
  }

  // Add JavaScript files into webpage for execution and processing in browser context
  await page.addScriptTag({ path: './src/structures/Box.js'});
  await page.addScriptTag({ path: './src/modules/box-extraction.js'});
  await page.addScriptTag({ url: 'https://unpkg.com/fast-average-color/dist/index.min.js'});

  // Box Extraction Process - JavaScript code evaluated in web browser context
  const extracted = await page.evaluate(async () => {

    const t0 = performance.now();
    var boxes;
    
    try {
      boxes = await extractBoxes(document.body);
    } catch (error) {
      page.on('console', msg => console.log('PAGE LOG:', msg.text() + '\n'));
    }
    const t1 = performance.now();

    return {
      boxes: boxes.boxes,
      boxesList: boxes.boxesList,
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
  clustering.process(extracted, clusteringThreshold);

  /* Visualize box tree representation of webpage and take screenshot */
  // vizualizer.createSvgRepresentation(extracted);

  // BCS has finished successfully!
  // console.log("BCS has finished successfully!");

})();

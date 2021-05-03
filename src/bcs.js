/**
 * Project: Box Clustering Segmentation in Node.js
 * Author: Tomas Zubrik, xzubri00@stud.fit.vutbr.cz
 * Year: 2021
 * License:  GNU GPLv3
 * Description: Main of Box Clustering Segmentation
 */

/* Import modules */
const clustering = require('./modules/clustering');

/* Import chromium from playwright */
const { chromium } = require('playwright');

/* Parse input arguments */
const argv = require('yargs/yargs')(process.argv.slice(2))
  .usage('Usage: $0 [options] <url>')
  .example('$0 -W 1200 -H 800 http://cssbox.sf.net', '')
  .strictOptions(true)
  .alias('CT', 'clustering-threshold').nargs('CT', 1)
  .default('CT', 0.5).describe('CT', 'Clustering Threshold')
  .alias('W', 'width').nargs('W', 1)
  .default('W', 1200).describe('W', 'Browser viewport width')
  .alias('H', 'height').nargs('H', 1)
  .default('H', 800).describe('H', 'Browser viewport height')
  .alias('S', 'save-screenshot').boolean('S')
  .default('S', true).describe('S', 'Save screenshot of rendered page')
  .alias('D','debug').boolean('D')
  .default('D', false).describe('D', 'Allow errors printing from browser')
  .alias('VI','vizualize-iteration').nargs('VI', 1)
  .default('VI', 0).number('VI').describe('VI', 'Vizualize iteration step i')
  .help('h').alias('h', 'help')
  .argv;

/* If url is not specified - close program immediately */
if (argv._.length !== 1) {
  process.stderr.write('<url> is required. Use -h for help.\n');
  process.exit(1);
}

/* Get all args to local variables */
const url = argv._[0];
const viewportWidth = argv.W;
const viewportHeight = argv.H;
const clusteringThreshold = argv.CT;
const debug = argv.D;
const saveScreenshot = argv.S;

/* BCS main process */
(async () => {

  /* Create browser instance */
  const browser = await chromium.launch();

  /* Open new page in browser */
  const page = await browser.newPage();

  /* Set viewport size specified by args */
  page.setViewportSize({
    width: viewportWidth,
    height: viewportHeight
  });

  /* Load webpage by url */
  try {
    await page.goto(url);
    // await page.goto('http://cssbox.sf.net');
    // await page.goto('https://en.wikipedia.org/wiki/Dyslalia', {waitUntil: 'domcontentloaded'});
    // await page.goto('https://en.wikipedia.org/wiki/Coronavirus', {waitUntil: 'domcontentloaded'});
    // await page.goto('http://localhost:8080/5colordivs.html', {waitUntil: 'domcontentloaded'});
    // await page.goto('https://en.wikipedia.org/wiki/Goods_and_services', {waitUntil: 'domcontentloaded'});
  } catch (e) {
    console.log(e.message);
    process.exit(1);
  }

  /* Allow logging of messages from automated Chromium browser */
  if (debug) {
    page
      .on('console', message => console.log(`${message.type().substr(0, 3).toUpperCase()} ${message.text()}`))
      .on('pageerror', ({ message }) => console.log(message))
      .on('requestfailed', request => console.log(`${request.failure().errorText} ${request.url()}`))
  }

  /* Add JavaScript files into webpage for execution of extraction process in browser context */
  await page.addScriptTag({ path: './src/structures/BoxInfo.js' });
  await page.addScriptTag({ path: './src/modules/box-extraction.js' });
  await page.addScriptTag({ url: 'https://unpkg.com/fast-average-color/dist/index.min.js' });

  /* Box Extraction Process - JavaScript code evaluated in web browser context */
  const extracted = await page.evaluate(async () => {

    const t0 = performance.now();
    const boxes = await extractBoxes(document.body);
    const t1 = performance.now();

    return {
      boxesList: boxes,
      document: {
        height: document.body.scrollHeight,
        width: document.body.scrollWidth
      },
      time: t1 - t0
    };
  });

  /* Capture screenshot of webpage in PNG format */
  if(saveScreenshot){
    await page.screenshot({ path: './output/webpage.png', fullPage: true });
  }

  /* Close browser instance (no longer needed) */
  await browser.close();

  // console.log("Extraction time:", extracted.time, "ms");

  /* Start Clustering Process */
  clustering.process(extracted, argv);

  /* Success message */
  console.log("BCS has finished successfully!");

})();

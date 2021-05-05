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
  .default('CT', 0.5).describe('CT', 'Clustering Threshold (CT > 0.0 && CT < 1.0)')
  .alias('W', 'width').nargs('W', 1)
  .default('W', 1200).describe('W', 'Browser viewport width')
  .alias('H', 'height').nargs('H', 1)
  .default('H', 800).describe('H', 'Browser viewport height')
  .alias('S', 'save-screenshot').boolean('S')
  .default('S', true).describe('S', 'Save screenshot of rendered page')
  .alias('D','debug').boolean('D')
  .default('D', false).describe('D', 'Allow errors printing from browser')
  .alias('VI','vizualize-iteration').nargs('VI', 1)
  .default('VI', 0).number('VI').describe('VI', `Vizualize interactive iteration step i`)
  .alias('I','show-info').boolean('I')
  .default('I', false).describe('I', `Show extraction and clustering info`)
  .boolean('basic').default('basic', false).describe('basic', `Use basic BCS implementation, default using extended`)
  .alias('E', 'export').nargs('E', 1)
  .default('E', 0).describe('E', 
    `Export boxes and clusters: 
    0 - default (export nothing)
    1 - boxes.png 
    2 - boxes.json 
    3 - clusters.png 
    4 - clusters.json 
    5 - clusters-over-webpage.png
    6 - all
    Use multiple: f.e. -E 134, -E 51
    Note: if 6 included -> everything is exported
          if 0 included -> nothing is exported
    `)
  .alias('O','output-folder').nargs('O', 1).describe('O', 'Output folder')
  .help('h').alias('h', 'help')
  .argv;

/* If url is not specified - close program immediately */
if (argv._.length !== 1) {
  console.error('<url> is required. Use -h for help.\n');
  process.exit(1);
}

/* Get all args to local variables */
argv.url = argv._[0];
argv.export = String(argv.export)

if(parseFloat(argv.CT) != argv.CT || argv.CT < 0 || argv.CT > 1) {
  console.error('Warning: Incorrect CT', argv.CT, 'Using default, 0.5');
  argv.CT = 0.5;
}

if(!Number.isInteger(argv.W) || argv.W <= 0 || argv.W > 1920) {
  console.error('Warning: Incorrect viewport width', argv.W, 'Using default', 1200);
  argv.W = 1200;
}

if(!Number.isInteger(argv.H) || argv.H <= 0) {
  console.error('Warning: Incorrect viewport height', argv.H, 'Using default', 800);
  argv.H = 800;
}

/* BCS main process */
(async () => {

  /* Create browser instance */
  const browser = await chromium.launch();

  /* Open new page in browser */
  const page = await browser.newPage();

  /* Set viewport size specified by args */
  page.setViewportSize({
    width: argv.W,
    height: argv.H
  });

  /* Load webpage by url */
  try {
    await page.goto(argv.url);
    // await page.goto('http://cssbox.sf.net');
    // await page.goto('https://en.wikipedia.org/wiki/Dyslalia', {waitUntil: 'domcontentloaded'});
    // await page.goto('https://en.wikipedia.org/wiki/Coronavirus', {waitUntil: 'domcontentloaded'});
    // await page.goto('http://localhost:8080/5colordivs.html', {waitUntil: 'domcontentloaded'});
    // await page.goto('https://en.wikipedia.org/wiki/Goods_and_services', {waitUntil: 'domcontentloaded'});
  } catch (e) {
    console.error(`Error: Invalid URL '${argv.url}' Exit 1`);
    process.exit(1);
  }

  /* Allow logging of messages from automated Chromium browser */
  if (argv.debug) {
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
  if(argv.saveScreenshot || argv.export.includes(5) || argv.export.includes(6)){
    await page.screenshot({ path: './output/webpage.png', fullPage: true });
  }

  /* Close browser instance (no longer needed) */
  await browser.close();

  if(argv.showInfo) {
    var extractionTime = parseFloat(extracted.time.toFixed(2));
    console.info("Info: [Extract] Extraction time:", extractionTime, "ms");
    console.info("Info: [Segment] BCS implementation:", argv.basic ? "basic" : "extended");
  }

  /* Start Segmentation/Clustering Process */
  clustering.createSegmentation(extracted, argv);

  /* Success message */
  if(argv.showInfo){
    console.info("Info: [Finish] BCS has finished successfully!");
  }

})();

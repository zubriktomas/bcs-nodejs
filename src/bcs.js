/**
 * Project: Box Clustering Segmentation in Node.js
 * Author: Tomas Zubrik, xzubri00@stud.fit.vutbr.cz
 * Year: 2021
 * Description: Main of Box Clustering Segmentation
 */

/* Import modules */
const clustering = require('./modules/clustering');

/* Import chromium from playwright */
const { chromium } = require('playwright');

/* Default output folder */
const defaultOutputFolder = './output/';

/* Parse input arguments */
const argv = require('yargs/yargs')(process.argv.slice(2))
  .usage('Usage: $0 [options] <url>')
  .example('$0 -W 1200 -H 800 http://cssbox.sf.net', '')
  .strictOptions(true)
  .alias('CT', 'clustering-threshold').nargs('CT', 1)
  .default('CT', 0.5).describe('CT', `Clustering Threshold (CT > 0.0 && CT < 1.0) OR 'guess'`)
  .alias('DT', 'density-threshold').nargs('DT', 1)
  .default('DT', 0).describe('DT', `Density Threshold (DT >= 0 && DT < 1.0) OR 'guess'`)
  .alias('W', 'width').nargs('W', 1)
  .default('W', 1200).describe('W', 'Browser viewport width')
  .alias('H', 'height').nargs('H', 1)
  .default('H', 800).describe('H', 'Browser viewport height')
  .alias('S', 'save-screenshot').boolean('S')
  .default('S', true).describe('S', 'Save screenshot of rendered page')
  .alias('D', 'debug').boolean('D')
  .default('D', false).describe('D', 'Allow errors printing from browser')
  .alias('VS', 'vizualize-iteration').nargs('VS', 1)
  .default('VS', 0).number('VS').describe('VS', `Vizualize segmentation step (interactive)`)
  .alias('I', 'show-info').boolean('I')
  .default('I', false).describe('I', `Show extraction and clustering info`)
  .boolean('extended').default('extended', false).describe('extended', `Use extended BCS implementation, default using basic`)
  .alias('E', 'export').nargs('E', 1)
  .default('E', 0).describe('E',
    `Export boxes and segments/clusters: 
    0 - default (nothing) 
    1 - boxes.png 
    2 - boxes.json 
    3 - segments.png 
    4 - segments.json 
    5 - segments-over-webpage.png
    6 - all
    7 - all-segmentation-steps as step[iteration].png (must be used as only option -E 7)
    8 - allNodesAsBoxes.json (evaluation and metrics calculation purposes)
    Usage: f.e. -E 134, -E 51, -E *6* (all), -E *0* (none)  
    `)
  .alias('A', 'aggresive').boolean('A')
  .default('A', false).describe('A', `Aggresive clustering - try to cluster all overlapping clusters`)
  .alias('IGIM', 'ignore-images').boolean('IGIM')
  .default('IGIM', false).describe('IGIM', `Ignore images average color, use default grey (Extraction option)`)
  .alias('WVEC', 'weight-vector').nargs('WVEC', 1)
  .default('WVEC', '[1,1,1]').describe('WVEC', `Use weight vector for similarity calculation [relDistW, shapeSimW, colorSimW]`)
  .alias('IURL', 'include-url-in-filename').boolean('IURL')
  .default('IURL', false).describe('IURL', 'Include URL in exported files filenames')
  .alias('O', 'output-folder').nargs('O', 1)
  .default('O', defaultOutputFolder).describe('O', 'Output folder path')
  .alias('CL', 'content-loading').nargs('CL', 1)
  .default('CL', 0).describe('CL', 'Content loading option (wait for): 0 - networkidle (slower, more precise), 1 - domcontentloaded (faster, less precise)')
  .help('h').alias('h', 'help')
  .argv;

/* If url is not specified - close program immediately */
if (argv._.length !== 1) {
  console.error('<url> is required. Use -h for help.\n');
  process.exit(1);
}

if(argv.CL != 0 && argv.CL != 1) {
  console.warn('Warning: Content loading option invalid. Using default', 0, 'networkidle');
  argv.CL = 0;
} 

/* Process weight vector from argument */
try {
  var weightVector = JSON.parse(argv.WVEC);  
  const isWeightVectorValueOK = (value) => value == parseFloat(value) && value >= 0 && value <= 1;
  if (weightVector.length != 3 || !isWeightVectorValueOK(weightVector[0]) || !isWeightVectorValueOK(weightVector[1]) || !isWeightVectorValueOK(weightVector[2])) {
    console.warn('Warning: Weight vector is invalid. Using default', [1, 1, 1]);
    argv.WVEC = [1, 1, 1];
  } else {
    argv.WVEC = weightVector;
  }
} catch (e) {
  console.warn('Warning: Weight vector is invalid. Using default', [1, 1, 1]);
  argv.WVEC = [1, 1, 1];
}

/* Check if weight vector was specified in basic implementation */
if(!argv.extended && !argv.WVEC.every( (val, i, arr) => val === arr[0])) {
  console.warn('Warning: Weight vector has no effect in basic implemenation. Use --extended.');
}

/* Get all args to local variables */
argv.url = argv._[0];
argv.export = String(argv.export)

/* Extract url substring to be a part of filename */
var urlSubstring = argv.url.startsWith("https") ? argv.url.substring(8) : argv.url.startsWith("http") ? argv.url.substring(7) : argv.url;
urlSubstring = urlSubstring.replace(/\//g, '_'); 

/* Substring of argument url */
const includedUrl = argv.IURL ? `[${urlSubstring}]` : "";
argv.includedUrl = includedUrl;

if (argv.A == true && argv.extended == false) {
  console.warn('Warning: Aggresive option can be used only in extended. Ignored.');
  argv.A = false;
}

if ((parseFloat(argv.CT) != argv.CT || argv.CT < 0 || argv.CT > 1) && argv.CT != "guess") {
  console.warn('Warning: Incorrect CT', argv.CT, 'Using default', 0.5);
  argv.CT = 0.5;
}

if ((parseFloat(argv.DT) != argv.DT || argv.DT < 0 || argv.DT > 1)) {
  if (!argv.extended) {
    console.warn('Warning: Density Threshold can not be used with basic implementation! Ignored.');
    argv.DT = 0.0;
  } else if (argv.DT != "guess") {
    console.warn('Warning: Incorrect DT', argv.DT, 'Using default', 0.0);
    argv.DT = 0.0;
  }
}

if (!Number.isInteger(argv.W) || argv.W <= 0 || argv.W > 1920) {
  console.warn('Warning: Incorrect viewport width', argv.W, 'Using default', 1200);
  argv.W = 1200;
}

if (!Number.isInteger(argv.H) || argv.H <= 0) {
  console.warn('Warning: Incorrect viewport height', argv.H, 'Using default', 800);
  argv.H = 800;
}

/* Print args info */
if (argv.showInfo) {
  console.info("Info: [Argument] URL:", argv.url);
  console.info("Info: [Argument] Clustering Threshold:", argv.CT);
  console.info("Info: [Argument] Viewport width:", argv.W);
  console.info("Info: [Argument] Viewport height:", argv.H);
  console.info("Info: [Argument] Save screenshot:", argv.S);
  console.info("Info: [Argument] Debug:", argv.D);
  console.info("Info: [Argument] BCS implementation:", argv.extended ? "extended" : "basic");
  console.info("Info: [Argument] Vizualize step (iteration):", argv.VS);
  console.info("Info: [Argument] Export options:", argv.E);
  console.info("Info: [Argument] Ignore images (average color):", argv.IGIM);
  console.info("Info: [Argument] Include URL in filenames:", argv.IURL);
  console.info("Info: [Argument] Output folder:", argv.O);

  if (argv.extended) {
    console.info("Info: [Argument] Aggresive clustering:", argv.A);
    console.info("Info: [Argument] Weighted vector:", argv.WVEC);
  }
}

/* BCS main process */
(async (includedUrl) => {

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


  /* Ignore images as variable for browser context */
  var ignoreImages = argv.IGIM;

  /* Wait for content loading state, specified by argument */
  await page.waitForLoadState(argv.CL == 0 ? 'networkidle' : 'domcontentloaded');

  /* Box Extraction Process - JavaScript code evaluated in web browser context */
  const extracted = await page.evaluate(async (ignoreImages) => {

    const t0 = performance.now();
    const boxes = await extractBoxes(document.body, ignoreImages);
    const allNodesAsBoxes = await extractAllNodesAsBoxes(ignoreImages);
    const t1 = performance.now();

    return {
      boxesList: boxes,
      allNodesAsBoxes: allNodesAsBoxes,
      pageDims: {
        height: document.body.scrollHeight,
        width: document.body.scrollWidth
      },
      time: t1 - t0
    };
  }, ignoreImages);

  /* Capture screenshot of webpage in PNG format */
  if (argv.saveScreenshot || argv.export.includes(5) || argv.export.includes(6)) {
    await page.screenshot({ path: argv.O + `webpage${includedUrl}.png`, fullPage: true });
  }

  /* Close browser instance (no longer needed) */
  await browser.close();

  if (argv.showInfo) {
    var extractionTime = parseFloat(extracted.time.toFixed(2));
    console.info("Info: [Extract] Extraction time:", extractionTime, "ms");
    console.info("Info: [Segment] BCS implementation:", argv.extended ? "extended" : "basic");
  }

  /* Start Segmentation/Clustering Process */
  clustering.createSegmentation(extracted, argv);

  /* Success message */
  if (argv.showInfo) {
    console.info("Info: [Finish] BCS has finished successfully!");
  }

})(includedUrl);

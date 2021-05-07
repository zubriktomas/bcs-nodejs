/**
 * Author: Tomas Zubrik, xzubri00@stud.fit.vutbr.cz
 * Date: 2021-05-01
 * 
 */

const { chromium } = require('playwright');
const { readFileSync, existsSync } = require('fs');
const sizeOfImage = require('image-size');
const { tryToLoadFile, FileType } = require('../src/modules/exporter');
const { areaTreeParse } = require('./areatree-parser');



/* Constants */
const bcsOutputFolder = './../output/';
const gtAnnotatorOutputFolder = './output/';
const webpageFilepathPNG = bcsOutputFolder + 'webpage.png'; 
const boxesFilepathPNG = bcsOutputFolder + 'boxes.png';
const boxesFilepathJSON = bcsOutputFolder + 'boxes.json';
const segmentsFilepathJSON = bcsOutputFolder + 'segments.json';

const webpagePNGDims = sizeOfImage(webpageFilepathPNG); // Get dimensions of page screenshot
const boxesPNGDims = sizeOfImage(boxesFilepathPNG); // Get dimensions of boxes screenshot

if(boxesPNGDims.width != webpagePNGDims.width) {
    console.warn("Screenshots have different width!. Try to run BCS with width of webpage screenshot:", webpagePNGDims.width,"!=" ,boxesPNGDims.width);
    console.warn("It can cause a vizualization inaccuracies");
}

const imageWidth = webpagePNGDims.width;
const imageHeight = webpagePNGDims.height;
const screenHeight = 1200;

/* Reference (FitLayout + puppeteer backend) implementation output */
const referenceSegmentsXML = './../../../fitlayout-jar/out/segments.xml';

/* Parse arguments */
const argv = require('yargs/yargs')(process.argv.slice(2))
    .usage('Usage: $0 [options] <url>')
    .strictOptions(true)
    .alias('WPNG', 'webpage-png-filepath')
    .default('WPNG', webpageFilepathPNG).describe('WPNG', 'Filepath to webpage PNG screenshot')
    .alias('BPNG', 'boxes-png-filepath')
    .default('BPNG', boxesFilepathPNG).describe('BPNG', 'Filepath to boxes PNG screenshot')
    .alias('BJSON', 'boxes-json-filepath')
    .default('BJSON', boxesFilepathJSON).describe('BJSON', 'Filepath to boxes JSON for metrics calculation')
    .alias('S1', 'segmentation1').default('S1', referenceSegmentsXML).describe('S1', 'Filepath to segmentation 1 (xml, json)')
    .alias('S2', 'segmentation2').default('S2', segmentsFilepathJSON).describe('S2', 'Filepath to segmentation 2 (xml, json)')
    .alias('S3', 'segmentation3').default('S3', segmentsFilepathJSON).describe('S3', 'Filepath to segmentation 3 (xml, json)')
    .help('h').alias('h', 'help')
    .argv;

/* Argument <url> is required! */
if (argv._.length !== 1) {
    process.stderr.write('<url> is required. Use -h for help.\n');
    process.exit(1);
}

const url = argv._[0];

/* Extract url substring to be a part of filename */
const urlSubstring = url.startsWith("https") ? url.substring(8) : url.startsWith("http") ? url.substring(7) : url;

/* Create filename for exported GT segments for specific webpage */
const gtSegmentsFilename = `GT-segments[${urlSubstring}].json`;

const data = loadDataFromFileSystem(argv);

/* Start Ground Truth annotator */
const startAnnotator = async () => {
    const browser = await chromium.launch({ headless: false })
    const context = await browser.newContext({ acceptDownloads: true });
    const page = await context.newPage();

    page.on('close', () => browser.close());

    await page.setViewportSize({
        width: imageWidth,
        height: screenHeight
    });

    /* Set content from html file */
    var contentHtml = readFileSync('./index.html', 'utf8');
    await page.setContent(contentHtml);

    /* Add all script (and style) tags */
    await page.addScriptTag({ path: './browser/enums.js' });
    await page.addScriptTag({ type: 'module', path: './browser/interact.js' });
    await page.addScriptTag({ path: './browser/listener-functions.js' });
    await page.addScriptTag({ url: 'https://cdn.jsdelivr.net/npm/rbush@3.0.1/rbush.min.js' });
    await page.addScriptTag({ path: './browser/rtree.js' });
    await page.addStyleTag({ url: 'https://cdn.jsdelivr.net/npm/notyf@3/notyf.min.css' });
    await page.addScriptTag({ url: 'https://cdn.jsdelivr.net/npm/notyf@3/notyf.min.js' });
    await page.addScriptTag({ path: './browser/set-operations.js' });
    await page.addScriptTag({ path: './browser/metrics.js' });

    /* Evaluate in browser context with loaded data from filesystem */
    await page.evaluate(async (data) => {

        /* Assign all useful variables to window object for global access */
        window.index = 1;
        window.bgA = `url("data:image/png;base64,${data.webpagePNG}")`;
        window.bgB = `url("data:image/png;base64,${data.boxesPNG}")`;
        window.addEventListener('mousemove', e => { window.mouseX = e.pageX; window.mouseY = e.pageY; });
        /* Inject Notyf object for simple notification toast messages */
        window.notyf = new Notyf({
            duration: 3000,
            position: {
                x: 'center',
                y: 'top',
            },
            dismissible: true
        });

        /* Assign segmentationX to all input segmentations for metrics calculation */
        data.segmentations.segmentation1.forEach(seg => seg.segm = 'segmentation1');
        data.segmentations.segmentation2.forEach(seg => seg.segm = 'segmentation2');
        data.segmentations.segmentation3.forEach(seg => seg.segm = 'segmentation3');
        data.segmentations.segmentationGT.forEach(seg => seg.segm = 'segmentationGT');

        /* Create RTree and load all data */
        const tree = new RTree();
        tree.load(data.boxes);
        tree.load(data.segmentations.segmentation1);
        tree.load(data.segmentations.segmentation2);
        tree.load(data.segmentations.segmentation3);
        tree.load(data.segmentations.segmentationGT);

        /* Load ground truth segments as movable DIVs */
        loadSegmentationGroundTruth(data.segmentations.segmentationGT);
        var baseline = tree.getBaselineWholePageSegment();
        tree.insert(baseline);

        /* Assign RTree to window for global access */
        window.tree = tree;

        /* If ground truth segmentation was loaded, calculate metrics and create results table immediately */
        if (data.segmentations.segmentationGT.length) {
            createMetricsResultsTable();
            showResultsModal();
        }

        /* Set body background image as webpage screenshot */
        document.body.style.backgroundImage = window.bgA;
        /* It is important to assign body height higher than imageHeight for scrolling down */
        document.body.style.height = `${data.imageHeight + 200}px`;

        /* Modal events listeners */
        document.addEventListener("keydown", e => selectFunctionByCodeKey(e, data.segmentations));
        window.onclick = e => { e.target == document.getElementById("myModal") ? hideResultsModal() : null };
        var resultsCloseButton = document.getElementsByClassName("close")[0];
        resultsCloseButton.onclick = hideResultsModal;

    }, data);

    /* Wait for download event to export annotated GT segments */
    while (1) {
        try {
            const download = await page.waitForEvent('download', { timeout: 0 });
            download.saveAs(gtAnnotatorOutputFolder+ gtSegmentsFilename);
        } catch (e) {
            console.log("Ground truth annotator was closed.");
        }
    }
}
startAnnotator();

/**
 * Load all files used by GT annotator (PNG and JSON files)
 * @param {*} argv program arguments
 * @returns all data in json
 */
function loadDataFromFileSystem(argv) {

    /* Load PNG files */
    const webpagePNG = tryToLoadFile(argv.WPNG, FileType.png);
    const boxesPNG = tryToLoadFile(argv.BPNG, FileType.png);

    /* Load boxes JSON */
    const boxes = tryToLoadFile(argv.BJSON, FileType.json);

    /* Loadd segmentations (xml, json) */
    const segmentation1 = argv.S1.includes('xml') ? JSON.parse(areaTreeParse(argv.S1)) : tryToLoadFile(argv.S1, FileType.json);
    const segmentation2 = argv.S2.includes('xml') ? JSON.parse(areaTreeParse(argv.S2)) : tryToLoadFile(argv.S2, FileType.json);
    const segmentation3 = argv.S3.includes('xml') ? JSON.parse(areaTreeParse(argv.S3)) : tryToLoadFile(argv.S3, FileType.json);
    const segmentationGT = tryToLoadFile(gtAnnotatorOutputFolder + gtSegmentsFilename, FileType.json); 

    const segmentations = { 
        segmentation1: segmentation1, 
        segmentation2: segmentation2, 
        segmentation3: segmentation3,
        segmentationGT: segmentationGT 
    };

    var data = {
        boxes: boxes,
        segmentations: segmentations,
        imageWidth: imageWidth,
        imageHeight: imageHeight,
        webpagePNG: webpagePNG,
        boxesPNG: boxesPNG
    }
    return data;
}

/**
 * Author: Tomas Zubrik, xzubri00@stud.fit.vutbr.cz
 * Date: 2021-05-01
 * 
 */

const { chromium } = require('playwright');
const { readFileSync, existsSync } = require('fs');
const sizeOfImage = require('image-size');
const { tryToLoadFile, FileType } = require('../src/modules/exporter');


/* Constants */
const bcsOutputFolder = './../output';
const gtAnnotatorOutputFolder = './output';
const dimensions = sizeOfImage(`${bcsOutputFolder}/webpage.png`); // Get dimensions of page screenshot
const imageWidth = dimensions.width;
const imageHeight = dimensions.height;
const screenHeight = 1200;

/* Parse and convert FiyLayout segments.xml to segments-ref.json */
var aTreeParserInFile = './../../../fitlayout-jar/out/segments.xml';
var aTreeParserOutFile = './input/segments-ref.json';
require('./areatree-parser').areaTreeParse(aTreeParserInFile, aTreeParserOutFile);

/* Parse arguments */
const argv = require('yargs/yargs')(process.argv.slice(2))
    .usage('Usage: $0 [options] <url>')
    .strictOptions(true)
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
const gtSegmentsFilename = `ground-truth-segments[${urlSubstring}].json`;

/* Load PNG (webpage and boxes screenshots) and JSON (segmentations) files from filesystem */
const data = loadDataFromFileSystem(bcsOutputFolder, gtAnnotatorOutputFolder, gtSegmentsFilename);

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
    await page.addScriptTag({ path: './browser/enums.js'});
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

        /* Create RTree and load all data */
        const tree = new RTree();
        tree.load(data.boxes);
        tree.load(data.segmentations.basic);
        tree.load(data.segmentations.reference);
        tree.load(data.segmentations.gt);

        /* Load ground truth segments as movable DIVs */
        loadSegmentationGroundTruth(data.segmentations.gt);
        var baseline = tree.getBaselineWholePageSegment();
        tree.insert(baseline);

        /* Assign RTree to window for global access */
        window.tree = tree;
        
        /* If ground truth segmentation was loaded, calculate metrics and create results table immediately */
        if (data.segmentations.gt.length) {
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
            download.saveAs(`${gtAnnotatorOutputFolder}/${gtSegmentsFilename}`);
        } catch (e) {
            console.log("Ground truth annotator was closed.");
        }
    }
}
startAnnotator();

// /**
//  * Try to load file by type from filesystem
//  * @param {*} filePath path to file 
//  * @param {FileType} type file type (PNG or JSON)
//  * @returns null or empty if not exists
//  */
// function tryToLoadFile(filePath, type) {
//     try {
//         if (existsSync(filePath)) {
//             return type == FileType.png ? readFileSync(filePath).toString('base64') : JSON.parse(readFileSync(filePath, 'utf8'));
//         } else {
//             console.log(`File ${filePath} does not exist!`);
//             console.log("Returns 'null' (png) / '[]' (json)");
//             return type == FileType.png ? null : [];
//         }
//     } catch (e) {
//         console.error(e);
//         process.exit(1);
//     }
// }

/**
 * Load all files used by GT annotator (PNG and JSON files)
 * @param {*} bcsOutputFolder BCS output folder path
 * @param {*} gtAnnotatorOutputFolder GT outout folder path
 * @param {*} gtSegmentsFilename GT export file filename
 * @returns data as object
 */
function loadDataFromFileSystem(bcsOutputFolder, gtAnnotatorOutputFolder, gtSegmentsFilename) {

    const webpagePNG = tryToLoadFile(`${bcsOutputFolder}/webpage.png`, FileType.png);
    const boxesPNG = tryToLoadFile(`${bcsOutputFolder}/boxes.png`, FileType.png);
    const boxes = tryToLoadFile(`${bcsOutputFolder}/boxes.json`, FileType.json);
    const segmentsBasic = tryToLoadFile(`${bcsOutputFolder}/segments.json`, FileType.json);
    const segmentsReference = tryToLoadFile('./input/segments-ref.json', FileType.json);
    const segmentsGT = tryToLoadFile(`${gtAnnotatorOutputFolder}/${gtSegmentsFilename}`, FileType.json);

    const segmentations = { reference: segmentsReference, basic: segmentsBasic, gt: segmentsGT };

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

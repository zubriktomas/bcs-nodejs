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
const segmentsFilepathPNG = bcsOutputFolder + 'segments.png';
const segmentsFilepathJSON = bcsOutputFolder + 'segments.json';
const segmentsOverWebpagePNG = bcsOutputFolder + 'segments-over-webpage.png';

const dimensions = sizeOfImage(webpageFilepathPNG); // Get dimensions of page screenshot
const imageWidth = dimensions.width;
const imageHeight = dimensions.height;
const screenHeight = 1200;


/* Parse and convert FiyLayout segments.xml to segments-ref.json */
const referenceSegmentsXML = './../../../fitlayout-jar/out/segments.xml';
// var aTreeParserOutFile = './input/segments-ref.json';
// require('./areatree-parser').areaTreeParse(aTreeParserInFile, aTreeParserOutFile);

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
    // .alias('D', 'debug').boolean('D')
    // .default('D', false).describe('D', 'Allow errors printing from browser')
    // .alias('D', 'debug').boolean('D')
    // .default('D', false).describe('D', 'Allow errors printing from browser')
    // .alias('D', 'debug').boolean('D')
    // .default('D', false).describe('D', 'Allow errors printing from browser')
    .help('h').alias('h', 'help')
    .argv;

/* Argument <url> is required! */
if (argv._.length !== 1) {
    process.stderr.write('<url> is required. Use -h for help.\n');
    process.exit(1);
}

const url = argv._[0];

// console.log(argv.S1);
// console.log(argv.S2);
// console.log(argv.S3);

/* Extract url substring to be a part of filename */
const urlSubstring = url.startsWith("https") ? url.substring(8) : url.startsWith("http") ? url.substring(7) : url;

/* Create filename for exported GT segments for specific webpage */
const gtSegmentsFilename = `GT-segments[${urlSubstring}].json`;

/* Load PNG (webpage and boxes screenshots) and JSON (segmentations) files from filesystem */
// const data = loadDataFromFileSystem(bcsOutputFolder, gtAnnotatorOutputFolder, gtSegmentsFilename);
// const data = loadDataFromFileSystem(bcsOutputFolder, aTreeParserInFile);

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

        /* Create RTree and load all data */
        const tree = new RTree();
        tree.load(data.boxes);
        // tree.load(data.segmentations.basic);
        // tree.load(data.segmentations.reference);
        // tree.load(data.segmentations.gt);
        data.segmentations.segmentation1.forEach(seg => seg.segm = 'segmentation1');
        data.segmentations.segmentation2.forEach(seg => seg.segm = 'segmentation2');
        data.segmentations.segmentation3.forEach(seg => seg.segm = 'segmentation3');
        data.segmentations.segmentationGT.forEach(seg => seg.segm = 'segmentationGT');

        window.s1 = data.segmentations.segmentation1;
        window.s2 = data.segmentations.segmentation2;
        window.s3 = data.segmentations.segmentation3;
        window.sGT = data.segmentations.segmentationGT;

        tree.load(data.segmentations.segmentation1);
        tree.load(data.segmentations.segmentation2);
        tree.load(data.segmentations.segmentation3);
        tree.load(data.segmentations.segmentationGT);

        /* Load ground truth segments as movable DIVs */
        // loadSegmentationGroundTruth(data.segmentations.gt);
        loadSegmentationGroundTruth(data.segmentations.segmentationGT);
        var baseline = tree.getBaselineWholePageSegment();
        tree.insert(baseline);

        /* Assign RTree to window for global access */
        window.tree = tree;

        /* If ground truth segmentation was loaded, calculate metrics and create results table immediately */
        // if (data.segmentations.gt.length) {
        //     createMetricsResultsTable();
        //     showResultsModal();
        // }
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
// function loadDataFromFileSystem(bcsOutputFolder, gtAnnotatorOutputFolder, gtSegmentsFilename) {

// function loadDataFromFileSystem(bcsOutputFolder, xmlInFile) {

function loadDataFromFileSystem(argv) {

    const webpagePNG = tryToLoadFile(argv.WPNG, FileType.png);
    const boxesPNG = tryToLoadFile(argv.BPNG, FileType.png);
    const boxes = tryToLoadFile(argv.BJSON, FileType.json);

    const segmentation1 = argv.S1.includes('xml') ? JSON.parse(areaTreeParse(argv.S1)) : tryToLoadFile(argv.S1, FileType.json);
    const segmentation2 = argv.S2.includes('xml') ? JSON.parse(areaTreeParse(argv.S2)) : tryToLoadFile(argv.S2, FileType.json);
    const segmentation3 = argv.S3.includes('xml') ? JSON.parse(areaTreeParse(argv.S3)) : tryToLoadFile(argv.S3, FileType.json);
    const segmentationGT = tryToLoadFile(gtAnnotatorOutputFolder + gtSegmentsFilename, FileType.json); 
    // const segmentsBasic = tryToLoadFile(`${bcsOutputFolder}/segments.json`, FileType.json);
    // const segmentsReference = tryToLoadFile('./input/segments-ref.json', FileType.json);
    // const segmentsGT = tryToLoadFile(`${gtAnnotatorOutputFolder}/${gtSegmentsFilename}`, FileType.json);
    // const segmentsGT = JSON.parse(areaTreeParse(xmlInFile));
// const segmentsGT = [];
    // console.log(segmentsGT);

    // const segmentations = { reference: segmentsReference, basic: segmentsBasic, gt: segmentsGT };
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

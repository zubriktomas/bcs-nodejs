const { chromium } = require('playwright');
const { readFileSync, existsSync } = require('fs');
const sizeOfImage = require('image-size');

/* Constants */
const bcsOutputFolder = './../output';
const gtAnnotatorOutputFolder = './output';
const dimensions = sizeOfImage(`${bcsOutputFolder}/webpage.png`); // Get dimensions of page screenshot
const imageWidth = dimensions.width;
const imageHeight = dimensions.height;
const screenHeight = 1200;
const FileType = Object.freeze({ png: 0, json: 1 });

/* Parse and convert FiyLayout segments.xml to segments-ref.json */
require('./areatree-parser').areaTreeParse();

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

/*  */
const startAnnotator = async () => {
    const browser = await chromium.launch({ headless: false })
    const context = await browser.newContext({ acceptDownloads: true });
    const page = await context.newPage();

    page.on('close', () => browser.close());

    await page.setViewportSize({
        width: imageWidth,
        height: screenHeight
    });

    var contentHtml = readFileSync('./index.html', 'utf8');
    await page.setContent(contentHtml);

    await page.addScriptTag({ type: 'module', path: './browser/interact.js' });
    await page.addScriptTag({ path: './browser/listener-functions.js' });

    await page.addScriptTag({ url: 'https://cdn.jsdelivr.net/npm/rbush@3.0.1/rbush.min.js' });
    await page.addScriptTag({ path: './browser/rtree.js' });

    await page.addStyleTag({ url: 'https://cdn.jsdelivr.net/npm/notyf@3/notyf.min.css' });
    await page.addScriptTag({ url: 'https://cdn.jsdelivr.net/npm/notyf@3/notyf.min.js' });

    await page.addScriptTag({ path: './browser/set-operations.js' });
    await page.addScriptTag({ path: './browser/metrics.js' });

    await page.evaluate(async (data) => {

        window.index = 1;
        window.bgA = `url("data:image/png;base64,${data.webpagePNG}")`;
        window.bgB = `url("data:image/png;base64,${data.renderedPNG}")`;
        window.addEventListener('mousemove', e => { window.mouseX = e.pageX; window.mouseY = e.pageY; });

        window.notyf = new Notyf({
            duration: 3000,
            position: {
                x: 'center',
                y: 'top',
            },
            dismissible: true
        });

        const tree = new RTree();
        tree.load(data.boxes);
        tree.load(data.segmentations.basic);
        tree.load(data.segmentations.reference);
        tree.load(data.segmentations.gt);
        loadSegmentationGroundTruth(data.segmentations.gt);
        var wholePageBaselineSegment = tree.getBaselineWholePageSegment();
        tree.insert(wholePageBaselineSegment);
        window.tree = tree;

        if (data.segmentations.gt.length) {
            createMetricsResultsTable();
        }

        document.body.style.backgroundImage = window.bgA;
        document.body.style.height = `${data.imageHeight + 200}px`;

        document.addEventListener("keydown", e => selectFunctionByCodeKey(e, data.segmentations));
        window.onclick = e => { e.target == document.getElementById("myModal") ? hideResultsModal() : null };

        var resultsCloseButton = document.getElementsByClassName("close")[0];
        resultsCloseButton.onclick = hideResultsModal;

    }, data);

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

function tryToLoadFile(filePath, type) {
    try {
        if (existsSync(filePath)) {
            return type == FileType.png ? readFileSync(filePath).toString('base64') : JSON.parse(readFileSync(filePath, 'utf8'));
        } else {
            console.log(`File ${filePath} does not exist!`);
            console.log("Returns 'null' (png) / '[]' (json)");
            return type == FileType.png ? null : [];
        }
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

function loadDataFromFileSystem(bcsOutputFolder, gtAnnotatorOutputFolder, gtSegmentsFilename) {

    const webpagePNG = tryToLoadFile(`${bcsOutputFolder}/webpage.png`, FileType.png);
    const renderedPNG = tryToLoadFile(`${bcsOutputFolder}/rendered.png`, FileType.png);
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
        renderedPNG: renderedPNG
    }
    return data;
}

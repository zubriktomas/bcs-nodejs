const { chromium } = require('playwright');
const { readFileSync, existsSync } = require('fs');
const sizeOfImage = require('image-size');




/* Parse FiyLayout segments.xml output */
require('./areatree-parser').areaTreeParse();

const argv = require('yargs/yargs')(process.argv.slice(2))
  .usage('Usage: $0 [options] <url>')
  .strictOptions(true)
//   .alias('CT', 'clustering-threshold').nargs('CT', 1)
//   .default('CT', 0.5).describe('CT', 'Clustering Threshold')
//   .alias('W', 'width').nargs('W', 1)
//   .default('W', 1200).describe('W', 'Browser viewport width')
//   .alias('H', 'height').nargs('H', 1)
//   .default('H', 800).describe('H', 'Browser viewport height')
//   .alias('S', 'save-screenshot').boolean('S')
//   .default('S', true).describe('S', 'Save screenshot of rendered page')
//   .alias('D','debug').boolean('D')
//   .default('D', false).describe('D', 'Allow errors printing from browser')
  .help('h').alias('h', 'help')
  .argv;

if (argv._.length !== 1) {
  process.stderr.write('<url> is required. Use -h for help.\n');
  process.exit(1);
}

const url = argv._[0];

var urlSubstring;

if(url.startsWith("https")) {
    urlSubstring = url.substring(8);
} else if (url.startsWith("http")) {
    urlSubstring = url.substring(7);
} else {
    urlSubstring = url;
}
// const viewportWidth = argv.W;
// const viewportHeight = argv.H;
// const clusteringThreshold = argv.CT;
// const debug = argv.D;
// const saveScreenshot = argv.S;

const bcsOutputFolder = './../output';
const gtAnnotatorOutputFolder = './output';
const gtSegmentsFilename = `ground-truth-segments[${urlSubstring}].json`;

/* Get dimensions of image and screen */
const dimensions = sizeOfImage(`${bcsOutputFolder}/webpage.png`);
const imageWidth = dimensions.width;
const imageHeight = dimensions.height;

const screenHeight = 1200;
// const screenWidth = screen.width;

const FileType = Object.freeze({ png: 0, json: 1 });

var data = loadDataFromFileSystem();
data.url = urlSubstring;

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
    
    await page.addScriptTag({ url: 'https://cdn.jsdelivr.net/npm/rbush@3.0.1/rbush.min.js'});
    await page.addScriptTag({ path: './browser/rtree.js'});

    await page.addStyleTag({ url: 'https://cdn.jsdelivr.net/npm/notyf@3/notyf.min.css' });
    await page.addScriptTag({ url: 'https://cdn.jsdelivr.net/npm/notyf@3/notyf.min.js'});

    await page.addScriptTag({ path: './browser/set-operations.js'});
    await page.addScriptTag({ path: './browser/metrics.js'});

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

        window.url = data.url;

        const tree = new RTree();
        tree.load(data.boxes);
        tree.load(data.segmentations.basic);
        tree.load(data.segmentations.reference);

        tree.load(data.segmentations.gt);        
        loadSegmentationGroundTruth(data.segmentations.gt);

        var wholePageBaselineSegment = tree.getBaselineWholePageSegment();
        tree.insert(wholePageBaselineSegment);
        window.tree = tree;

        if(data.segmentations.gt.length) {
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
        if(existsSync(filePath)) {
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

function loadDataFromFileSystem() {

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

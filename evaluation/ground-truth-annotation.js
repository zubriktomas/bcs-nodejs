const { chromium } = require('playwright');
const { readFileSync } = require('fs');
const sizeOfImage = require('image-size');

/* Parse FiyLayout segments.xml output */
require('./areatree-parser').areaTreeParse();

const bcsOutputFolder = './../output';

/* Get dimensions of image and screen */
const dimensions = sizeOfImage(`${bcsOutputFolder}/webpage.png`);
const imageWidth = dimensions.width;
const imageHeight = dimensions.height;

// const screenHeight = 1200;
// const screenWidth = 1920;

const data = loadDataFromFileSystem();

const startAnnotator = async () => {
    const browser = await chromium.launch({ headless: false })
    const context = await browser.newContext({ acceptDownloads: true });
    const page = await context.newPage();

    page.on('close', () => browser.close());

    await page.setViewportSize({
        width: imageWidth,
        height: imageHeight
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

        const tree = new RTree();
        tree.load(data.boxes);
        tree.load(data.segmentations.basic);
        tree.load(data.segmentations.reference);
        window.tree = tree;

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
            download.saveAs('./output/ground-truth-segments.json');
        } catch (e) {
            console.log("Ground truth annotator was closed.");
        }
    }
}
startAnnotator();

function loadDataFromFileSystem() {
    const webpagePNG = readFileSync(`${bcsOutputFolder}/webpage.png`).toString('base64');
    const renderedPNG = readFileSync(`${bcsOutputFolder}/rendered.png`).toString('base64');
    
    var segmentsBasic = JSON.parse(readFileSync(`${bcsOutputFolder}/segments.json`, 'utf8'));
    var segmentsReference = JSON.parse(readFileSync('./input/segments-ref.json', 'utf8'));
    var boxes = JSON.parse(readFileSync(`${bcsOutputFolder}/boxes.json`, 'utf8'));
    var segmentations = { reference: segmentsReference, basic: segmentsBasic };

    const data = {
        boxes: boxes,
        segmentations: segmentations,
        imageWidth: imageWidth,
        imageHeight: imageHeight,
        webpagePNG: webpagePNG,
        renderedPNG: renderedPNG
    }
    return data;
}

const { chromium } = require('playwright');
const { readFileSync } = require('fs');
const { selectFunctionByCodeKey } = require('./listener-functions');
const sizeOfImage = require('image-size');
const screenres = require('screenres');

require('./areatree-parser').areaTreeParse();

const bcsOutputFolder = './../output';

const webpagePNG = readFileSync(`${bcsOutputFolder}/webpage.png`).toString('base64');
const renderedPNG = readFileSync(`${bcsOutputFolder}/rendered.png`).toString('base64'); 

var basicImplClusters = JSON.parse(readFileSync(`${bcsOutputFolder}/segments.json`, 'utf8'));
var referenceImplClusters = JSON.parse(readFileSync('./input/segments-ref.json', 'utf8'));
var dataClusters = {ref: referenceImplClusters, basic: basicImplClusters};

const dimensions = sizeOfImage(`${bcsOutputFolder}/webpage.png`);
const viewportWidth = dimensions.width;
const viewportHeight = dimensions.height;

const screenHeight = screenres.get()[1];
const screenWidth = screenres.get()[0];

const data = {
    dataClusters: dataClusters, 
    viewportWidth: viewportWidth,
    viewportHeight: viewportHeight,
    webpagePNG: webpagePNG,
    renderedPNG: renderedPNG
}

const startAnnotator = async () => {
    const browser = await chromium.launch({ headless: false })
    const context = await browser.newContext({ acceptDownloads: true });
    const page = await context.newPage();

    page.on('close', () => browser.close());

    await page.setViewportSize({
        width: viewportWidth,
        height: screenHeight
    });

    var contentHtml = readFileSync('./index.html', 'utf8');
    await page.setContent(contentHtml);
    await page.addScriptTag({ type: 'module', path: './interact.js' });
    await page.addScriptTag({ path: './listener-functions.js'});

    await page.evaluate(async (data) => {

        window.index = 1;
        window.bgA = `url("data:image/png;base64,${data.webpagePNG}")`;
        window.bgB = `url("data:image/png;base64,${data.renderedPNG}")`;
        window.addEventListener('mousemove', e => {window.mouseX = e.pageX; window.mouseY = e.pageY;} );
        
        document.body.style.backgroundImage = window.bgA;
        document.body.style.height = `${data.viewportHeight+200}px`;
        
        document.addEventListener("keydown", e => selectFunctionByCodeKey(e, data.dataClusters));
        window.onclick = e => { e.target == document.getElementById("myModal") ? hideResultsModal() : null};
        
        var resultsCloseButton = document.getElementsByClassName("close")[0];
        resultsCloseButton.onclick = hideResultsModal;
        
    }, data);

    while(1) {
        try {
            const download = await page.waitForEvent('download', {timeout: 0});
            download.saveAs('./output/exported-ground-truth-clusters.json');
        } catch (e) {
            console.log("Ground truth annotator was closed.");
        }
    }
}
startAnnotator();
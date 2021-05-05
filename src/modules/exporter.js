/**
 * Project: Box Clustering Segmentation in Node.js
 * Author: Tomas Zubrik, xzubri00@stud.fit.vutbr.cz
 * Year: 2021
 * License:  GNU GPLv3
 * Description: Box Vizualizer to show box neighbours, segments
 */

const { writeFileSync } = require('fs');
const { chromium } = require('playwright');
const { readFileSync, existsSync } = require('fs');
const { buildHtmlTemplate } = require('./box-vizualizer');

const FileType = Object.freeze({ png: 0, json: 1 });

const exportPNG = async (data) => {

    const browser = await chromium.launch({ headless: true })
    const context = await browser.newContext({ acceptDownloads: true });
    const page = await context.newPage();

    page.on('close', () => browser.close());

    await page.setViewportSize({
        width: data.pageDims.width,
        height: data.pageDims.height
    });

    await page.setContent(buildHtmlTemplate());

    /* Evaluate in browser context with loaded data from filesystem */
    await page.evaluate(async (data) => {

        /* Set body background image as webpage screenshot */
        if(data.webpagePNG){
            document.body.style.backgroundImage = `url("data:image/png;base64,${data.webpagePNG}")`;
        }

        document.body.style.height = `${data.pageDims.height}px`; 

        convertEntitiesToDivs(data.boxesList ? data.boxesList : data.clustersList);

        function convertEntitiesToDivs(entities) {

            for (const entity of entities) {
                let div = document.createElement('div');
                div.style.top = `${entity.top}px`;
                div.style.left = `${entity.left}px`;
                div.style.height = `${entity.height}px`;
                div.style.width = `${entity.width}px`;
                div.style.position = 'absolute';
                div.style.zIndex = 100;
                div.style.backgroundColor = entity.type == 0 ? entity.color : "";
                div.style.border = entity.type == 1 ? "2px solid #FF0000" : "";
                document.body.appendChild(div);
            }
        }

    }, data);

    if(data.boxesList) {
        await page.screenshot({ path: './output/boxes.png', fullPage: true });
    } else if(data.clustersList && data.webpagePNG) {
        await page.screenshot({ path: './output/segments-over-webpage.png', fullPage: true });
    } else if(data.clustersList) {
        await page.screenshot({ path: './output/segments.png', fullPage: true });
    }

    await browser.close();
}


function exportFiles(argv, data) {

    /* From program arguments, f.e. 1234567 */
    var exportListString = argv.export;

    var pageDims = data.pageDims;
    var clustersList = createClusterListForExport(data.clustersMap);
    var boxesList = createBoxesListForExport(data.boxesMap);
    
    /* Export all files */
    if(exportListString.includes(6)) {
        exportPNG({boxesList: boxesList, pageDims: pageDims});
        exportBoxesToJson(boxesList, './output/boxes.json');
        exportPNG({clustersList: clustersList, pageDims: pageDims});
        exportClustersToJson(clustersList, './output/segments.json');

        const webpagePNG = tryToLoadFile(`./output/webpage.png`, FileType.png);    
        exportPNG({clustersList: clustersList, pageDims: pageDims, webpagePNG: webpagePNG})

        if (argv.showInfo) {
            console.info("Info: [Export] (6) All PNG and JSON files exported");
        }
        return;
    }

    /* Boxes PNG */
    if(exportListString.includes(1)) {
        exportPNG({boxesList: boxesList, pageDims: pageDims});
        if (argv.showInfo) {
            console.info("Info: [Export] (1) Boxes exported as PNG");
        }
    }
    
    /* Boxes JSON */
    if(exportListString.includes(2)) {
        exportBoxesToJson(boxesList, './output/boxes.json');
        if (argv.showInfo) {
            console.info("Info: [Export] (2) Boxes exported as JSON");
        }
    }
    
    /* Segments PNG */
    if(exportListString.includes(3)) {
        exportPNG({clustersList: clustersList, pageDims: pageDims});
        if (argv.showInfo) {
            console.info("Info: [Export] (3) Clusters exported as PNG");
        }
    }
    
    /* Segments JSON */
    if(exportListString.includes(4)) {
        exportClustersToJson(clustersList, './output/segments.json');
        if (argv.showInfo) {
            console.info("Info: [Export] (4) Clusters exported as JSON");
        }
    }

    /* Segments over webpage screenshot PNG */
    if(exportListString.includes(5)) {
        const webpagePNG = tryToLoadFile(`./output/webpage.png`, FileType.png);    
        exportPNG({clustersList: clustersList, pageDims: pageDims, webpagePNG: webpagePNG})
        if (argv.showInfo) {
            console.info("Info: [Export] (5) Clusters over webpage screenshot");
        }
    }
}

function createClusterListForExport(clustersMap) {
    const convertCluster = (c) => {
        var cluster = {};
        cluster.left = c.left;
        cluster.top = c.top;
        cluster.right = c.right;
        cluster.bottom = c.bottom;
        cluster.width = c.right - c.left;
        cluster.height = c.bottom - c.top;
        cluster.type = c.type;
        cluster.segm = 'basic';
        return cluster;
    }
    
    var clustersToExport = [];
    for (const cluster of clustersMap.values()) {
        clustersToExport.push(convertCluster(cluster));
    }

    return clustersToExport;
}

function exportClustersToJson(clustersToExport, filepath) {
    writeFileSync(filepath, JSON.stringify(clustersToExport), (err) => {
        if (err) throw err;
    });
}

function createBoxesListForExport(boxesMap) {
    const convertBox = (b) => {
        var box = {};
        box.left = b.left;
        box.top = b.top;
        box.right = b.right;
        box.bottom = b.bottom;
        box.width = b.width
        box.height = b.height;
        box.color = b.color;
        box.type = b.type;
        return box;
    }

    var boxesToExport = [];
    for (const box of boxesMap.values()) {
        boxesToExport.push(convertBox(box));
    }
    return boxesToExport;
}

function exportBoxesToJson(boxesToExport, filepath) {
    writeFileSync(filepath, JSON.stringify(boxesToExport), (err) => {
        if (err) throw err;
    });
}

/**
 * Try to load file by type from filesystem
 * @param {*} filePath path to file 
 * @param {FileType} type file type (PNG or JSON)
 * @returns null or empty if not exists
 */
function tryToLoadFile(filePath, type) {
    try {
        if (existsSync(filePath)) {
            return type == FileType.png ? readFileSync(filePath).toString('base64') : JSON.parse(readFileSync(filePath, 'utf8'));
        } else {
            console.error(`Error: File ${filePath} does not exist!`);
            console.error(`       Returns 'null' (png) / '[]' (json)`);
            return type == FileType.png ? null : [];
        }
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

module.exports = { exportFiles, tryToLoadFile, FileType };
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

 const ExportOption = Object.freeze({
     boxesPNG: 0, 
     boxesJSON: 1, 
     clustersPNG: 3,
     clustersJSON: 4,
     clustersOverBoxes: 5,
     clustersOverWebpage: 6,
     all: 7
});

// function loadDataFromFileSystem(bcsOutputFolder, gtAnnotatorOutputFolder, gtSegmentsFilename) {

//     const webpagePNG = tryToLoadFile(`${bcsOutputFolder}/webpage.png`, FileType.png);
//     const renderedPNG = tryToLoadFile(`${bcsOutputFolder}/boxes.png`, FileType.png);
//     const boxes = tryToLoadFile(`${bcsOutputFolder}/boxes.json`, FileType.json);
//     const segmentsBasic = tryToLoadFile(`${bcsOutputFolder}/segments.json`, FileType.json);
//     const segmentsReference = tryToLoadFile('./input/segments-ref.json', FileType.json);
//     const segmentsGT = tryToLoadFile(`${gtAnnotatorOutputFolder}/${gtSegmentsFilename}`, FileType.json);

//     const segmentations = { reference: segmentsReference, basic: segmentsBasic, gt: segmentsGT };

//     var data = {
//         boxes: boxes,
//         segmentations: segmentations,
//         imageWidth: imageWidth,
//         imageHeight: imageHeight,
//         webpagePNG: webpagePNG,
//         renderedPNG: renderedPNG
//     }
//     return data;
// }

function exportByOption(argv, option, data, filepath) {

    const startExporter = async (data) => {

        const browser = await chromium.launch({ headless: true })
        const context = await browser.newContext({ acceptDownloads: true });
        const page = await context.newPage();
        
        page.on('close', () => browser.close());
        
        await page.setViewportSize({
            width: data.width,
            height: data.height
        });
        
        await page.setContent(buildHtmlTemplate());
        
        /* Evaluate in browser context with loaded data from filesystem */
        await page.evaluate(async (data) => {
            
            convertEntitiesToDivs(data.boxes);
            convertEntitiesToDivs(data.clusters ? data.clusters : []);
            
            function convertEntitiesToDivs(entities) {
                
                for (const entity of entities) {
                    let div = document.createElement('div');
                    div.id = entity.id;
                    div.style.top = `${entity.top}px`;
                    div.style.left = `${entity.left}px`;
                    div.style.height = `${entity.height}px`;
                    div.style.width = `${entity.width}px`;
                    div.style.position = 'absolute';
                    div.style.zIndex = entity.type == 0 ? 100 : 200;
                    div.style.backgroundColor = entity.color;
                    div.style.opacity = entity.type == 0 ? 1.0 : 0.4;
                    document.body.appendChild(div);
                }
            }
            
        }, data);
        
        await page.screenshot({path: './output/boxes.png', fullPage: true});
        await browser.close();
    }

    switch (option) {
        case ExportOption.boxesPNG:
            startExporter(data);
            break;

        case ExportOption.boxesJSON:
            exportBoxesToJson(data);
            break;

        case ExportOption.clustersPNG:
            break;

        case ExportOption.clustersJSON:
            exportClustersToJson(data);
            break;

        case ExportOption.clustersOverBoxes:
            break;
    
        case ExportOption.clustersOverWebpage:
            break;

        case ExportOption.all:
            break;

        default:
            break;
    }
    
    function exportClustersToJson(clustersMap) {
        
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
        
        var clustersJson = JSON.stringify(clustersToExport);
        
        if(argv.showInfo) {
            console.info("Info: Clusters exported to JSON", filepath);
        }
        
        writeFileSync(filepath, clustersJson, (err) => {
            if (err) throw err;
            
        });
    }
    
    function exportBoxesToJson(boxesMap) {
        
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
        
        var boxesJson = JSON.stringify(boxesToExport);
        
        if(argv.showInfo) {
            console.info("Info: Extracted boxes exported to JSON", filepath);
        }
        
        writeFileSync(filepath, boxesJson, (err) => {
            if (err) throw err;
        });
        
    }
    
   
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
    
module.exports = {exportByOption, ExportOption, tryToLoadFile, FileType};
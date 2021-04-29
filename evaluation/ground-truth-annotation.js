const { chromium } = require('playwright');
const { readFileSync } = require('fs');
const { selectFunctionByCodeKey } = require('./listener-functions');


const webpagePNG = readFileSync('./../output/webpage.png').toString('base64');
const renderedPNG = readFileSync('./../output/rendered.png').toString('base64'); 
var referenceImplClusters = JSON.parse(readFileSync('./../../../fitlayout-jar/out/segments.json', 'utf8'));
var basicImplClusters = JSON.parse(readFileSync('./../output/segments.json', 'utf8'));

var dataClusters = {ref: referenceImplClusters, basic: basicImplClusters};

const viewportWidth = 1200;
const viewportHeight = 950;

const data = {
    dataClusters: dataClusters, 
    viewportWidth: viewportWidth,
    viewportHeight: viewportHeight,
    webpagePNG: webpagePNG,
    renderedPNG: renderedPNG
}

const generateMarkup = async () => {
    const browser = await chromium.launch({ headless: false })
    const context = await browser.newContext({ acceptDownloads: true });
    const page = await context.newPage();
    // const page = await browser.newPage()
    await page.setViewportSize({
        width: viewportWidth,
        height: viewportHeight
    });


    var contentHtml = readFileSync('./index.html', 'utf8');
    await page.setContent(contentHtml);

    // const html = `
    //   <html>
    //   <head> 
    //     <style> 
    //         body { 
    //             margin: 0; 
    //             padding: 0; 
    //             width: ${viewportWidth}px;
    //             height: ${viewportHeight}px;
    //         }

    //         .bg {
    //             position:absolute;
    //             width: 100%;
    //             height:100%;
    //             z-index: -1;
    //         }
            
    //         .backgroundA {
    //             background-image: url("data:image/png;base64,${webpagePNG}");
    //         }
            
    //         .backgroundB {
    //             background-image: url("data:image/png;base64,${renderedPNG}");
    //         }

    //         .resize-drag {
    //             width: 60px;
    //             border-radius: 2px; 
    //             padding: 35px;
    //             background-color: #29e;
    //             opacity: 0.4;
    //             color: white;
    //             font-size: 20px;
    //             font-family: sans-serif;
    //             position: absolute;
    //             z-index: 99;
              
    //             touch-action: none;
              
    //             /* This makes things *much* easier */
    //             box-sizing: border-box;
    //           }

    //         div:focus {
    //             background-color: Aqua;
    //         }

    //         .hiddenDiv {
    //             visibility: hidden;
    //         }

    //         /* The Modal (background) */
    //         .modal {
    //             display: none; /* Hidden by default */
    //             position: fixed; /* Stay in place */
    //             z-index: 100; /* Sit on top */
    //             padding-top: 100px; /* Location of the box */
    //             left: 0;
    //             top: 0;
    //             width: 100%; /* Full width */
    //             height: 100%; /* Full height */
    //             overflow: auto; /* Enable scroll if needed */
    //             background-color: rgb(0,0,0); /* Fallback color */
    //             background-color: rgba(0,0,0,0.4); /* Black w/ opacity */
    //         }

    //         /* Modal Content */
    //         .modal-content {
    //             background-color: #fefefe;
    //             margin: auto;
    //             padding: 20px;
    //             border: 1px solid #888;
    //             width: 80%;
    //         }

    //         /* The Close Button */
    //         .close {
    //             color: #aaaaaa;
    //             float: right;
    //             font-size: 28px;
    //             font-weight: bold;
    //         }

    //         .close:hover,
    //             .close:focus {
    //             color: #000;
    //             text-decoration: none;
    //             cursor: pointer;
    //         }

    //         table {
    //             font-family: arial, sans-serif;
    //             border-collapse: collapse;
    //             width: 100%;
    //           }
              
    //           td, th {
    //             border: 1px solid #dddddd;
    //             text-align: left;
    //             padding: 8px;
    //           }
              
    //     </style>
    //   </head>
    //   <body>
    //     <div id="backgroundScreenshot" class="bg backgroundA"></div>

    //     <!-- The Modal -->
    //     <div id="myModal" class="modal">
    //         <!-- Modal content -->
    //         <div id="myModalContent" class="modal-content">
    //             <span class="close">&times;</span>
    //             <h1>Results</h1>
    //             ${table}
    //         </div>
    //     </div>

    //   </body>
    //   </html>
    // `;
    // await page.setContent(html)

    await page.addScriptTag({ type: 'module', path: './interact.js' });
    await page.addScriptTag({ path: './listener-functions.js'});


    await page.evaluate(async (data) => {

        document.body.style.width = `${data.viewportWidth}px`;
        document.body.style.height = `${data.viewportHeight}px`;
        
        window.bgA = `url("data:image/png;base64,${data.webpagePNG}")`;
        window.bgB = `url("data:image/png;base64,${data.renderedPNG}")`;

        document.getElementById('backgroundScreenshot').style.backgroundImage = window.bgA;

        window.onclick = e => { e.target == document.getElementById("myModal") ? hideResultsModal() : null};
        document.addEventListener("keydown", e => selectFunctionByCodeKey(e, data.dataClusters));

        // When the user clicks on <span> (x), close the modal
        var resultsCloseButton = document.getElementsByClassName("close")[0];
        resultsCloseButton.onclick = hideResultsModal;
    }, data);

    page.on('close', () => browser.close());

    while(1) {
        try {
            const download = await page.waitForEvent('download', {timeout: 0});
            download.saveAs('./output/exported-ground-truth-clusters.json');
        } catch (error) {
            console.log("Ground truth annotator was closed.");
        }
    }


    //   for (const el of box) {
    //     const html = `<div style="top:${el.top};left:${el.left};width:${el.width};height:${el.height};color:${el.color};position:absolute;">
    //         This div has ${el.color} color.
    //       </div>`

    //     await page.goto('about:blank')
    //     await page.setContent(html)
    //     await page.waitForTimeout(1000)
    //     await page.screenshot({ path: `./output/rendered-${el.color}.png`, fullPage: true })
    //   }
    //   await browser.close()
}
generateMarkup()
const { chromium } = require('playwright');
const { readFileSync } = require('fs');
const { selectFunctionByCodeKey } = require('./listener-functions');


const webpagePNG = readFileSync('./../output/webpage.png').toString('base64');
const renderedPNG = readFileSync('./../output/rendered.png').toString('base64'); 
var referenceImplClusters = JSON.parse(readFileSync('./../../../fitlayout-jar/out/segments.json', 'utf8'));
var basicImplClusters = JSON.parse(readFileSync('./../output/segments.json', 'utf8'));

const viewportWidth = 1200;
const viewportHeight = 950;

const generateMarkup = async () => {
    const browser = await chromium.launch({ headless: false })
    const context = await browser.newContext({ acceptDownloads: true });
    const page = await context.newPage();
    // const page = await browser.newPage()
    await page.setViewportSize({
        width: viewportWidth,
        height: viewportHeight
    });

    const table = `
    <table>
    <tr>
      <th>Firstname</th>
      <th>Lastname</th>
      <th>Age</th>
    </tr>
    <tr>
      <td>Jill</td>
      <td>Smith</td>
      <td>50</td>
    </tr>
    <tr>
      <td>Eve</td>
      <td>Jackson</td>
      <td>94</td>
    </tr>
  </table>
    `;


    const html = `
      <html>
      <head> 
        <style> 
            body { 
                margin: 0; 
                padding: 0; 
                width: ${viewportWidth}px;
                height: ${viewportHeight}px;
            }
            
            .backgroundA {
                background-image: url("data:image/png;base64,${webpagePNG}");
                position:absolute;
                width: 100%;
                height:100%;
                z-index: -1;
            }
            
            .backgroundB {
                background-image: url("data:image/png;base64,${renderedPNG}");
                position:absolute;
                width: 100%;
                height: 100%;
                z-index: -1;
            }

            .resize-drag {
                width: 60px;
                border-radius: 2px; 
                padding: 35px;
                background-color: #29e;
                opacity: 0.4;
                color: white;
                font-size: 20px;
                font-family: sans-serif;
                position: absolute;
                z-index: 99;
              
                touch-action: none;
              
                /* This makes things *much* easier */
                box-sizing: border-box;
              }

            div:focus {
                background-color: Aqua;
            }

            .hiddenDiv {
                visibility: hidden;
            }

            /* The Modal (background) */
            .modal {
                display: none; /* Hidden by default */
                position: fixed; /* Stay in place */
                z-index: 100; /* Sit on top */
                padding-top: 100px; /* Location of the box */
                left: 0;
                top: 0;
                width: 100%; /* Full width */
                height: 100%; /* Full height */
                overflow: auto; /* Enable scroll if needed */
                background-color: rgb(0,0,0); /* Fallback color */
                background-color: rgba(0,0,0,0.4); /* Black w/ opacity */
            }

            /* Modal Content */
            .modal-content {
                background-color: #fefefe;
                margin: auto;
                padding: 20px;
                border: 1px solid #888;
                width: 80%;
            }

            /* The Close Button */
            .close {
                color: #aaaaaa;
                float: right;
                font-size: 28px;
                font-weight: bold;
            }

            .close:hover,
                .close:focus {
                color: #000;
                text-decoration: none;
                cursor: pointer;
            }

            table {
                font-family: arial, sans-serif;
                border-collapse: collapse;
                width: 100%;
              }
              
              td, th {
                border: 1px solid #dddddd;
                text-align: left;
                padding: 8px;
              }
              
        </style>
      </head>
      <body>
        <div id="backgroundScreenshot" class="backgroundA"></div>

        <!-- The Modal -->
        <div id="myModal" class="modal">
            <!-- Modal content -->
            <div id="myModalContent" class="modal-content">
                <span class="close">&times;</span>
                <h1>Results</h1>
                ${table}
            </div>
        </div>

      </body>
      </html>
    `;

            

    await page.setContent(html)

    await page.addScriptTag({ type: 'module', path: './interact.js' });
    await page.addScriptTag({ path: './listener-functions.js'});


    await page.evaluate(async ({referenceImplClusters, basicImplClusters}) => {

        /* Incremented in addGroundTruthCluster in listener-functions.js */
        window.index = 1;

        var ImplementationType = Object.freeze({
            ref:'referenceImplCluster', 
            basic:'basicImplCluster', 
            extended:'extendedImplCluster'
        });

        document.addEventListener("keydown", e => selectFunctionByCodeKey(e));

        function clusterToDiv(cluster, clusterImplType) {

            var color;
            switch (clusterImplType) {
                case ImplementationType.ref:
                    color = "rgba(128, 0, 0, 0.5)";
                    break;
            
                case ImplementationType.basic:
                    color = "rgba(0, 128, 0, 0.5)";
                    break;

                case ImplementationType.extended:
                    color = "rgba(0, 0, 128, 0.5)";
                    break;

                default:
                    color = rgba(0, 0, 0, 0.5);
                    break;
            }

            let div = document.createElement('div');
                div.style = `
                    width: ${cluster.width}px; 
                    height: ${cluster.height}px;
                    top: ${cluster.top}px;
                    left: ${cluster.left}px;
                    position: absolute;
                    z-index: 99;
                    background-color: ${color};
                    opacity: 0.5;
                `;
                div.className = clusterImplType;
                document.body.appendChild(div);
        }


        document.addEventListener("keydown", e => {
            if (e.code === "Digit1") {
                var referenceImplDivs = document.querySelectorAll('.'+ImplementationType.ref);

                if(referenceImplDivs.length == 0) {
                    for (const cluster of referenceImplClusters) {
                        clusterToDiv(cluster, ImplementationType.ref);
                    }
                } else {
                    for (const div of referenceImplDivs) {
                        div.classList.toggle('hiddenDiv');
                    }
                }
            }
        });

        document.addEventListener("keydown", e => {
            if (e.code === "Digit2") {
                var basicImplDivs = document.querySelectorAll('.'+ImplementationType.basic);

                if(basicImplDivs.length == 0) {
                    for (const cluster of basicImplClusters) {
                        clusterToDiv(cluster, ImplementationType.basic);
                    }
                } else {
                    for (const div of basicImplDivs) {
                        div.classList.toggle('hiddenDiv');
                    }
                }
            }
        });

        document.addEventListener("keydown", e => {
            if (e.code === "Digit3") {
                // var referenceImplDivs = document.querySelectorAll('.'+ImplementationType.extended);

                // if(referenceImplDivs.length == 0) {
                //     for (const cluster of referenceImplClusters) {
                //         clusterToDiv(cluster, ImplementationType.extended);
                //     }
                // } else {
                //     for (const div of referenceImplDivs) {
                //         div.classList.toggle('hiddenDiv');
                //     }
                // }
            }
        });

        



        // Get the modal
        var modal = document.getElementById("myModal");
        var myModalContent = document.getElementById('myModalContent');

        // Get the <span> element that closes the modal
        var span = document.getElementsByClassName("close")[0];

        // When the user clicks on <span> (x), close the modal
        span.onclick = function() {
            myModalContent.removeChild(document.getElementById('refParagraph'));
            myModalContent.removeChild(document.getElementById('basicParagraph'));
            modal.style.display = "none";
        }

        // When the user clicks anywhere outside of the modal, close it
        window.onclick = function(event) {
            if (event.target == modal) {
                myModalContent.removeChild(document.getElementById('refParagraph'));
                myModalContent.removeChild(document.getElementById('basicParagraph'));
                modal.style.display = "none";
            }
        }

        document.addEventListener("keydown", e => {
            if (e.code === "Escape") {
                if(modal.style.display === "block") {
                    myModalContent.removeChild(document.getElementById('refParagraph'));
                    myModalContent.removeChild(document.getElementById('basicParagraph'));
                    modal.style.display = "none";
                }
            }
        });



        document.addEventListener("keydown", e => {
            if (e.code === "KeyR") {
                if(modal.style.display == "block") {
                    console.log("modal close by R");
                    var myModalContent = document.getElementById('myModalContent');
                    myModalContent.removeChild(document.getElementById('refParagraph'));
                    myModalContent.removeChild(document.getElementById('basicParagraph'));
                    modal.style.display = "none";
                    return;
                }


                var myModalContent = document.getElementById('myModalContent');
                var refImplText, basicImplText;
                var refClustersLoaded=false, basicClustersLoaded=false;

                var refParagraph = document.createElement('p'), 
                    basicParagraph = document.createElement('p');

                refParagraph.id = "refParagraph";
                basicParagraph.id = "basicParagraph";
            
                var referenceImplDivs = document.querySelectorAll('.'+ImplementationType.ref);
                if(referenceImplDivs.length > 0) {
                    refClustersLoaded = true;
                    refImplText = document.createTextNode("Reference implementation clusters loaded!");
                } else {
                    refImplText = document.createTextNode("Reference implementation clusters NOT LOADED YET!");
                }
                
                var basicImplDivs = document.querySelectorAll('.'+ImplementationType.basic);
                if(basicImplDivs.length > 0) {
                    basicClustersLoaded = true;
                    basicImplText = document.createTextNode("Basic implementation clusters loaded!");
                } else {
                    basicImplText = document.createTextNode("Basic implementation clusters NOT LOADED YET!");
                }


                refParagraph.appendChild(refImplText);
                basicParagraph.appendChild(basicImplText);

                var refPcheck = document.getElementById('refParagraph');
                var basicPcheck = document.getElementById('basicParagraph');

                if(refPcheck == null && basicPcheck == null) {
                    myModalContent.appendChild(refParagraph);
                    myModalContent.appendChild(basicParagraph);
                }

                modal.style.display = "block";        
            }
        });

        //   document.addEventListener("keydown", e => {
        //     console.log(e);
        //   })
    }, {referenceImplClusters, basicImplClusters});


    


    const download = await page.waitForEvent('download', {timeout: 0});

    download.saveAs('./output/clusters.json');

    page.on('close', () => {
        console.log('page closed');
        browser.close();
    });



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
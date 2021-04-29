const { chromium } = require('playwright');
const { readFileSync } = require('fs');

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
                background-image: url("data:image/png;base64,${readFileSync('./../../output/webpage.png').toString('base64')}");
                position:absolute;
                width: 100%;
                height:100%;
                z-index: -1;
            }
            
            .backgroundB {
                background-image: url("data:image/png;base64,${readFileSync('./../../output/rendered.png').toString('base64')}");
                position:absolute;
                width: 100%;
                height: 100%;
                z-index: -1;
            }

            .resize-drag {
                width: 60px;
                border-radius: 2px; 
                padding: 40px;
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

        
        </style>
      </head>
      <body>
        <div id="backgroundScreenshot" class="backgroundA"></div>
        <!-- <div id="div0" class="resize-drag"></div> -->
      </body>
      </html>
    `;
    await page.setContent(html)

    await page.addScriptTag({ type: 'module', path: './interact-test.js' });

    await page.evaluate(async () => {

        var index = 1;

        document.addEventListener("keydown", e => {
            if (e.code === "Enter") {
                enterPressed = true;
                console.log("[browser] enter was pressed");
            }
        });

        document.addEventListener("keydown", e => {
            if (e.code === "KeyA") {
                console.log("N was pressed");
                let div = document.createElement('div');
                div.className = 'resize-drag';
                div.id = `div${index}`;
                div.tabIndex = "0";
                document.body.appendChild(div);
                index++;
            }
        });

        document.addEventListener("keydown", e => {
            if (e.code === "KeyS") {
                console.log("S was pressed");
                var bgScreenshot = document.getElementById('backgroundScreenshot');


                if (bgScreenshot.className == "backgroundA") {
                    bgScreenshot.className = "backgroundB";
                } else {
                    bgScreenshot.className = "backgroundA";
                }
            }
        });

        document.addEventListener("keydown", e => {
            if (e.code === "KeyD" && document.hasFocus()) {

                var el = document.activeElement;

                if (el.id.startsWith("div")) {
                    console.log(el.id, "deleted!");
                    el.remove();
                }
            }
        });

        document.addEventListener("keydown", e => {
            if (e.code === "KeyE") {
                console.log("key E pressed");

                var divElements = document.querySelectorAll(".resize-drag");

                function convertToCluster(divElement) {
                    var cluster = {};
                    cluster.top = Number(divElement.dataset.x);
                    cluster.left = Number(divElement.dataset.y);
                    cluster.width = divElement.offsetWidth;
                    cluster.height = divElement.offsetHeight;
                    cluster.right = cluster.left + cluster.width;
                    cluster.bottom = cluster.top + cluster.height;
                    return cluster;
                }

                var clusters = [];

                for (const div of divElements) {
                    var cluster = convertToCluster(div);
                    clusters.push(cluster);
                }
                
                // const box = { left: 100, right: 100, bottom: 100, top: 100, color: "rgb(15,77,77)" };

                function downloadJsonFile(data, filename) {
                    // Creating a blob object from non-blob data using the Blob constructor
                    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    // Create a new anchor element
                    const a = document.createElement('a');
                    a.href = url;
                    a.id = "download";
                    a.style = "position: absolute; width:100px; height: 100px;";
                    a.download = filename || 'download';
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                  }

                // downloadJsonFile(box, 'box.json');
                downloadJsonFile(clusters, "clusters.json");
            }
        });

        //   document.addEventListener("keydown", e => {
        //     console.log(e);
        //   })
    });


    


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
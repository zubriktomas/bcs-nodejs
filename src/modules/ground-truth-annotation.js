const { chromium } = require('playwright');
const { readFileSync } = require('fs');

const viewportWidth = 1200;
const viewportHeight = 950;

const generateMarkup = async () => {
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage()
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
                margin: 1rem;
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
        <div id="test" class="backgroundA"></div>
        <!-- <div id="div0" class="resize-drag"></div> -->
      </body>
      </html>
    `;
    await page.setContent(html)

    await page.addScriptTag({ type: 'module', path: './interact-test.js'});

    await page.evaluate(async () => {

        var index = 1;

        document.addEventListener("keydown", e => {
            if (e.code === "Enter") {
              enterPressed = true;
              console.log("[browser] enter was pressed");
            }
          });

        document.addEventListener("keydown", e => {
            if (e.code === "KeyN") {
                console.log("N was pressed");
                let div = document.createElement('div');
                div.className = 'resize-drag';
                div.id = `div${index}`;
                div.tabIndex ="0";
                div.addEventListener("mousemove", e => {
                    console.log("mouse over", div.id);
                });

                document.body.appendChild(div);
                index++;
            }
          });

          document.addEventListener("keydown", e => {
            if(e.code === "KeyD" && document.hasFocus()) {

                var el = document.activeElement;

                if(el.id.startsWith("div")) { 
                    console.log(el.id, "deleted!");
                    el.remove();
                }
            }
          });

        //   document.addEventListener("keydown", e => {
        //     console.log(e);
        //   })
    });

    
    // await page.waitForTimeout(2000)
    await page.screenshot({ path: `./output/teeeest.png`, fullPage: true })

    page.on ('close', () => {
        console.log ('page closed');
        browser.close();});
    




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
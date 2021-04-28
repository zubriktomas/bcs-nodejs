const { chromium } = require('playwright');
const { readFileSync } = require('fs');

const box = [
  { top: '0', left: '6rem', width: '5rem', height: '5rem', color: 'red' },
  { top: '3rem', left: '3rem', width: '5rem', height: '5rem', color: 'green' },
  { top: '6rem', left: '0', width: '5rem', height: '5rem', color: 'blue' }
]


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
                width: 120px;
                border-radius: 8px;
                padding: 20px;
                margin: 1rem;
                background-color: #29e;
                color: white;
                font-size: 20px;
                font-family: sans-serif;
              
                touch-action: none;
              
                /* This makes things *much* easier */
                box-sizing: border-box;
              }
        
        </style>

        <script type="module">

        

        </script>

      </head>
      <body>
        <!-- <div id="test" class="backgroundA"></div> -->
        <div class="resize-drag">
            Resize from any edge or corner
        </div>
      </body>
      </html>
    `;
    await page.setContent(html)

    await page.addScriptTag({ type: 'module', path: './interact-test.js'});

    await page.evaluate(async () => {
        document.addEventListener("keydown", e => {
            if (e.code === "Enter") {
              enterPressed = true;
              console.log("[browser] enter was pressed");
            }
          });
    });

    
    // await page.waitForTimeout(2000)
    await page.screenshot({ path: `./output/teeeest.png`, fullPage: true })


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
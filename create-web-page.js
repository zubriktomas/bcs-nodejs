var http = require('http');
var svg = require('svg-builder');
const puppeteer = require('puppeteer');

module.exports.runServer = runServer;

function runServer(data) {
  const server = http.createServer((req, res) => {
    var html = buildHtml(req, data);
  
    res.writeHead(200, {
      'Content-Type': 'text/html',
      'Content-Length': html.length,
      'Expires': new Date().toUTCString()
    });
    res.end(html);
  }).listen(8080, async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({
      width: 1000,
      height: 600,
      deviceScaleFactor: 0
    });

    try {
        await page.goto('http://localhost:8080', {waitUntil: 'networkidle2'});
    } catch (err) {
        console.log(err);
    }

    await page.screenshot({path: 'rendered.png', fullPage: true});

    console.log('Done');
    browser.close();
    server.close();


  });
}


function buildHtml(req, data) {

  svg.width(1000);
  svg.height(40000);

  data.forEach(element => {
    var bbox = JSON.parse(element.bbox);

    svg.rect({
      x: bbox.x,
      y: bbox.y,
      width: bbox.width,
      height: bbox.height,
      fill: element.color,
      'stroke-width': 1,
      stroke: element.color
    });    
  });

  // svg.rect({
  //     x: 100,
  //     y: 100,
  //     width: 100,
  //     height: 100,
  //     fill: 'none',
  //     'stroke-width': 1,
  //     stroke: '#CB3728'
  // });



  return svg.render();

}


// function buildHtml(req) {
//   var header = `<style>
    
//     /* unvisited link */
//     a:link {
//         color: red;
//     }

//     /* visited link */
//     a:visited {
//         color: green;
//     }

//     /* mouse over link */
//     a:hover {
//         color: hotpink;
//     }

//     /* selected link */
//     a:active {
//         color: blue;
//     }

//     #example1 {
//         width: 100%;
//         height: 100%;
//         position: relative;
//         background-color: yellow;
//     }
//   </style>`;
  
//   var body = `
//     <div id="example1"> 
//         <svg width="400" height="180">
//             <rect x="50" y="20" rx="20" ry="20" width="150" height="150"
//             style="fill:red;stroke:black;stroke-width:5;opacity:0.5" />
//         </svg>
//     </div>
  
//   `;

  // concatenate header string
  // concatenate body string

//   return '<!DOCTYPE html>'
//        + '<html><head>' + header + '</head><body>' + body + '</body></html>';
// };
const http = require('http');
const svg = require('svg-builder');
const { chromium } = require('playwright');

module.exports.runServer = runServer;

function runServer(data) {

  // Create new http server
  const server = http.createServer((req, res) => {

    // Create box representation of webpage data
    var html = buildHtml(req, data);

    // Create http head
    res.writeHead(200, {
      'Content-Type': 'text/html',
      'Content-Length': html.length,
      'Expires': new Date().toUTCString()
    });
    res.end(html);

  }).listen(8090, async () => {

    // Launch Chromium browser
    const browser = await chromium.launch();
    const page = await browser.newPage();

    // Set size of viewport
    page.setViewportSize({
      width: 1000,
      height: 600
    });

    await page.goto('http://localhost:8090', {waitUntil: 'domcontentloaded'});

    // Take screenshot of rendered boxes
    await page.screenshot({path: './output/rendered.png', fullPage: true});

    browser.close();
    server.close();

  });
}

// Create visual (SVG) representation of given box structure
function createSvgBox(box) {

  svg.rect({
    x: box.left,
    y: box.top,
    width: box.width,
    height: box.height,
    fill: box.color,
    padding:0,
    margin:0
  });
}

function createSvgClusterBox(cluster) {
  var width = cluster.right - cluster.left;
  var height = cluster.bottom - cluster.top;
  
  // console.log(cluster.right, cluster);

  svg.rect({
    x: cluster.left,
    y: cluster.top,
    width: width,
    height: height,
    fill: 'none',
    stroke:'#FF0000',
    'stroke-width': 3,
    padding:0,
    margin:0
  });

}

// Create box representation of webpage nodes
function buildHtml(req, data) {

  var header = `<style> body { margin: 0; padding:0; } </style>`;

  svg.width(data.document.width);
  svg.height(data.document.height);

  data.boxes.forEach(box => {
    createSvgBox(box);  
  });

  data.clusters.forEach(cluster => {
    createSvgClusterBox(cluster);
  });

  return `<!DOCTYPE html>
            <head> 
              ${header} 
            </head>
            <body> 
              ${svg.render()} 
            </body>
          </html>`;
}

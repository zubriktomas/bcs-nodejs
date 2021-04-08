/**
 * Project: Box Clustering Segmentation in Node.js
 * Author: Tomas Zubrik, xzubri00@stud.fit.vutbr.cz
 * Year: 2021
 * License:  GNU GPLv3
 * Description: Main function program block
 */


const http = require('http');
const svg = require('svg-builder');
const { chromium } = require('playwright');

module.exports.createSvgRepresentation = createSvgRepresentation;

function createSvgRepresentation(data) {

  // Create new http server
  const server = http.createServer((req, res) => {

    // Create box representation of webpage data
    var html = buildSvg(req, data);

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

function createSvgRect(entity, props) {

  svg.rect({
    x: props.x || entity.left,
    y: props.y || entity.top,
    width: props.width || entity.width || entity.right - entity.left,
    height: props.height || entity.height || entity.bottom - entity.top ,
    fill: props.fill || 'none',
    stroke: props.stroke || 'none',
    'stroke-width':  props.strokeWidth || 0,
    'stroke-opacity': props.strokeOpacity || 1,
    padding: props.padding || 0,
    margin: props.margin || 0
  });
}

// Create box representation of webpage nodes
function buildSvg(req, data) {

  var header = `<style> body { margin: 0; padding:0; } </style>`;

  svg.width(data.document.width);
  svg.height(data.document.height);

  if(data.boxes){
    for (const box of data.boxes) {
      createSvgRect(box, {fill: box.color});
    }
  }
  
  if(data.clusters) {
    for (const cluster of data.clusters) {
      createSvgRect(cluster, {stroke: '#000000', strokeWidth: 3}); //stroke color: BLACK
    }
  }
  
  if(data.entityA) {
    createSvgRect(data.entityA, {stroke: '#2FFF7A', strokeWidth: 2});  //stroke color: GREEN
  }

  if(data.entityB) {
    createSvgRect(data.entityB, {stroke: '#2FFF7A', strokeWidth: 2}); //stroke color: GREEN
  }

  if(data.neighbours) {
    for (const neighbour of data.neighbours) {
      createSvgRect(neighbour, {stroke: '#fc03df', strokeWidth: 2}); // color: MAGENTA
    }
  }

  if(data.cc) {
    createSvgRect(data.cc, {stroke: '#FF0000', strokeWidth: 3});
  }

  return `<!DOCTYPE html>
            <head> 
              ${header} 
            </head>
            <body> 
              ${svg.render()} 
            </body>
          </html>`;
}

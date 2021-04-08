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

function createSvgClusterBox(cluster, type) {
  var width = cluster.right - cluster.left;
  var height = cluster.bottom - cluster.top;
  
  svg.rect({
    x: cluster.left,
    y: cluster.top,
    width: width,
    height: height,
    fill: 'none',
    stroke: !type ? '#FF0000': type=='cluster' ? '#2FFF7A' : '#f5e942', // green|red|cyan
    'stroke-width':  type && type=='box' ? 2 : 3,
    'stroke-opacity': type && type=='cluster' ? 0.5 : 1.0,  
    padding: 0,
    margin:0
  });
}

// Create box representation of webpage nodes
function buildSvg(req, data) {

  var boxes, clusters, header;
  
  header = `<style> body { margin: 0; padding:0; } </style>`;

  svg.width(data.document.width);
  svg.height(data.document.height);

  if(data.hasOwnProperty('boxes')){
    boxes = Array.isArray(data.boxes) ? data.boxes : Object.values(data.boxes);
    boxes.forEach(box => {
      createSvgBox(box);  
    });
  }
  
  if(data.hasOwnProperty('clusters')) {
    clusters = Array.isArray(data.clusters) ? data.clusters : Object.values(data.clusters);
    clusters.forEach(cluster => {
      createSvgClusterBox(cluster);
    });
  }
  
  if(data.hasOwnProperty('entityA')) {
    if(data.entityA) {
      createSvgClusterBox(data.entityA, 'box');
    }
  }

  if(data.hasOwnProperty('entityB')) {
    if(data.entityB) {
      createSvgClusterBox(data.entityB, 'box');
    }
  }

  if(data.hasOwnProperty('cc')) {
    if(data.cc) {
      createSvgClusterBox(data.cc, 'cluster');
    }
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

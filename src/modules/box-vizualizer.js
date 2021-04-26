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
const { isCluster } = require('../structures/EntityType');

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
    'fill-opacity': props.fillOpacity || 1,
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

  console.log(data);

  if(data.boxes){
    for (const box of data.boxes) {
      createSvgRect(box, {fill: box.color});
    }
  }

  if(data.clusters) {
    for (const cluster of data.clusters) {
      createSvgRect(cluster, {stroke: 'ORANGE', strokeWidth: 3}); //stroke color: ORANGE
    }
  }

  if(data.entityA) {
    createSvgRect(data.entityA, isCluster(data.entityB) ? {stroke: 'GREEN', strokeWidth: 3} : {fill: 'GREEN', fillOpacity: 0.7});  //stroke color: GREEN
  }

  if(data.entityB) {
    createSvgRect(data.entityB, isCluster(data.entityB) ? {stroke: 'GREEN', strokeWidth: 3} : {fill: 'GREEN', fillOpacity: 0.7}); //stroke color: GREEN
  }

  if(data.neighbours) {
    for (const neighbour of data.neighbours) {
      createSvgRect(neighbour, {fill: '#fc03df', fillOpacity: 0.7}); // color: MAGENTA
    }
  }

  if(data.cc) {
    createSvgRect(data.cc, {stroke: '#FF0000', strokeWidth: 2});
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

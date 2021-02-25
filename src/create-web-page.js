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
  }).listen(8090, async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.addStyleTag({
      content: '@page { size: 1000px 3160px; }'})
    await page.setViewport({
      width: 1000,
      height: 600,
      deviceScaleFactor: 0
    });

    try {
        await page.goto('http://localhost:8090', {waitUntil: 'networkidle2'});
    } catch (err) {
        console.log(err);
    }

    await page.screenshot({path: './output/rendered.png', fullPage: true});

    console.log('Done');
    browser.close();
    server.close();

  });
}

function buildHtml(req, data) {

  var header = `<style> body { margin: 0; padding:0; height: ${data.document.height}px; } </style>`;

  svg.width(data.document.width);
  svg.height(data.document.height);

  data.elements.forEach(element => {
    var bbox = JSON.parse(element.bbox);

    svg.rect({
      x: bbox.x,
      y: bbox.y,
      width: bbox.width,
      height: bbox.height,
      fill: element.color,
      'stroke-width': 1,
      stroke: element.color,
      padding:0,
      margin:0
    });    
  });

  data.imgelements.forEach(img => {
    var bbox = JSON.parse(img.bbox);

    svg.rect({
      x: bbox.x,
      y: bbox.y,
      width: bbox.width,
      height: bbox.height,
      fill: img.color,
      padding:0,
      margin:0
    });  


  });

  return '<!DOCTYPE html>'
       + '<html><head>' + header + '</head><body>' + svg.render() + '</body></html>';

}

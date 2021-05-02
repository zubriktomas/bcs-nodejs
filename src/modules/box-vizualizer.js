/**
 * Project: Box Clustering Segmentation in Node.js
 * Author: Tomas Zubrik, xzubri00@stud.fit.vutbr.cz
 * Year: 2021
 * License:  GNU GPLv3
 * Description: Box Vizualizer to show box neighbours, segments
 */

const { chromium } = require('playwright');

function vizualize(data) {

  /* Start Box vizualizer */
  const startBoxVizualizer = async (data) => {
    
    console.log(data.boxes.length);
    
    const browser = await chromium.launch({ headless: true })
    const context = await browser.newContext({ acceptDownloads: true });
    const page = await context.newPage();
    
    page.on('close', () => browser.close());
    
    await page.setViewportSize({
      width: data.width,
      height: data.height
    });
    
    await page.setContent(buildHtmlTemplate());
    
    /* Evaluate in browser context with loaded data from filesystem */
    await page.evaluate(async (data) => {

      window.boxesMap= new Map();

      convertBoxesToDivs(data.boxes);

      function handleMouseHoverEvent(event) {
        var boxFromMap = window.boxesMap.get(event.target.id);

        if(event.type === "mouseenter") {
          event.target.style.backgroundColor = '#FFFF00';
          for (const boxNeighbourId of boxFromMap.neighboursIds) {
            document.getElementById(boxNeighbourId).style.backgroundColor = '#FF00FF';
          }
        } else {
          event.target.style.backgroundColor = boxFromMap.oldColor;
          for (const boxNeighbourId of boxFromMap.neighboursIds) {
            var boxOldColor = window.boxesMap.get(boxNeighbourId).oldColor;
            document.getElementById(boxNeighbourId).style.backgroundColor = boxOldColor;
          }
        }
      }

      function convertBoxesToDivs(boxes) {

        for (const box of boxes) {
          window.boxesMap.set(box.id, box);
          let div = document.createElement('div');
          div.id = box.id;
          div.style.top = `${box.top}px`;
          div.style.left = `${box.left}px`;
          div.style.height = `${box.height}px`;
          div.style.width = `${box.width}px`;
          div.style.position = 'absolute';
          div.style.zIndex = 100;
          div.style.backgroundColor = box.color;
          div.addEventListener('mouseenter', handleMouseHoverEvent);
          div.addEventListener('mouseleave', handleMouseHoverEvent);
          document.body.appendChild(div);
        }
      }
      
    }, data);

    await page.screenshot({path: './output/rendered.png', fullPage: true});
    await browser.close();
  }
  startBoxVizualizer(data);
}

function buildHtmlTemplate() {
  var header = `<style> body { margin: 0; padding:0; } </style>`;

  return `<!DOCTYPE html>
            <head>
              ${header}
            </head>
            <body>
            </body>
          </html>`;
}
  
// function createSvgRect(entity, props) {

//   svg.rect({
//     x: props.x || entity.left,
//     y: props.y || entity.top,
//     width: props.width || entity.width || entity.right - entity.left,
//     height: props.height || entity.height || entity.bottom - entity.top ,
//     fill: props.fill || 'none',
//     'fill-opacity': props.fillOpacity || 1,
//     stroke: props.stroke || 'none',
//     'stroke-width':  props.strokeWidth || 0,
//     'stroke-opacity': props.strokeOpacity || 1,
//     padding: props.padding || 0,
//     margin: props.margin || 0
//   });
// }

// Create box representation of webpage nodes
// function buildSvg(req, data) {

//   var header = `<style> body { margin: 0; padding:0; } </style>`;

//   svg.width(data.document.width);
//   svg.height(data.document.height);

//   if(data.boxes){
//     for (const box of data.boxes) {
//       createSvgRect(box, {fill: box.color});
//     }
//   }

//   if(data.clusters) {
//     for (const cluster of data.clusters) {
//       createSvgRect(cluster, {stroke: 'ORANGE', strokeWidth: 3}); //stroke color: ORANGE
//     }
//   }

//   if(data.entityA) {
//     createSvgRect(data.entityA, isCluster(data.entityB) ? {stroke: 'GREEN', strokeWidth: 3} : {fill: 'GREEN', fillOpacity: 0.7});  //stroke color: GREEN
//   }

//   if(data.entityB) {
//     createSvgRect(data.entityB, isCluster(data.entityB) ? {stroke: 'GREEN', strokeWidth: 3} : {fill: 'GREEN', fillOpacity: 0.7}); //stroke color: GREEN
//   }

//   if(data.cc) {
//     createSvgRect(data.cc, {stroke: '#FF0000', strokeWidth: 2});
//   }

module.exports.vizualize = vizualize;
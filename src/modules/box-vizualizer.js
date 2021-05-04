/**
 * Project: Box Clustering Segmentation in Node.js
 * Author: Tomas Zubrik, xzubri00@stud.fit.vutbr.cz
 * Year: 2021
 * License:  GNU GPLv3
 * Description: Box Vizualizer to show box neighbours, segments
 */

const { chromium } = require('playwright');
const { EntityType } = require('../structures/EntityType');

const VizualizerOption = Object.freeze({onlyBoxes:0, boxesAndClusters:1});

/* Expect boxes and clusters data */
function vizualizeStep(data) {
  data.options = { show: VizualizerOption.boxesAndClusters };
  startBoxVizualizer(data);
}

/* Expect boxes data */
function vizualize(data) {
  data.options = { show: VizualizerOption.onlyBoxes };
  startBoxVizualizer(data);
}

/* Start Box vizualizer */
const startBoxVizualizer = async (data) => {
    
  console.log(data.boxes.length);
  
  const browser = await chromium.launch({ headless: false })
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

    window.boxesMap = new Map();
    window.clustersMap = new Map();
    window.relationsList = data.relations;
    if(data.bestRel)
    window.bestRel = data.bestRel;

    convertEntitiesToDivs(data.boxes);
    convertEntitiesToDivs(data.clusters ? data.clusters : []);


    var relAId;
    var relBId;

    if(data.bestRel){
    relAId = data.bestRel.entityAId;
    relBId = data.bestRel.entityBId;

    if(window.boxesMap.has(relAId)) {
      window.boxesMap.get(relAId).oldColor = "#FF1600";
    }

    if(window.clustersMap.has(relAId)) {
      window.clustersMap.get(relAId).oldColor = "#FF1600";
    }

    if(window.boxesMap.has(relBId)) {
      window.boxesMap.get(relBId).oldColor = "#FF1600";
    }

    if(window.clustersMap.has(relBId)) {
      window.clustersMap.get(relBId).oldColor = "#FF1600";
    }

    document.getElementById(relAId).style.backgroundColor = "#FF1600";
    document.getElementById(relBId).style.backgroundColor = "#FF1600";
    }

    function handleMouseHoverEvent(event) {
      var boxFromMap = window.boxesMap.get(event.target.id);
      var clusterFromMap = window.clustersMap.get(event.target.id);

      if(event.type === "mouseenter") {
        event.target.style.backgroundColor = '#FFFF00';
        console.log(boxFromMap ? boxFromMap : clusterFromMap);
        // var neighboursIds = boxFromMap ? boxFromMap.neighboursIds : clusterFromMap.neighboursIds;
        var neighboursIdsAndRelationsIds = boxFromMap ? boxFromMap.neighboursIdsAndRelationsIds : clusterFromMap.neighboursIdsAndRelationsIds;

        for (const nnn of neighboursIdsAndRelationsIds) {
          var neighbourDiv = document.getElementById(nnn.neighbourId); 
          neighbourDiv.style.backgroundColor = '#FF00FF';
          neighbourDiv.innerText = `${nnn.similarity.toFixed(3)}  ${window.relationsList.includes(nnn.relationId)}`;
        }


        // for (const neighbourId of neighboursIds) {
        //   var neighbourDiv = document.getElementById(neighbourId); 
        //   neighbourDiv.style.backgroundColor = '#FF00FF';

          
        //   var result = neighboursIdsAndRelationsIds.find(obj => {
        //     return obj.neighbourId === neighbourId
        //   });

        //   neighbourDiv.innerText = result.similarity;
        // }
      } else {
        event.target.style.backgroundColor = boxFromMap ? boxFromMap.oldColor : clusterFromMap.oldColor;

        var neighboursIds = boxFromMap ? boxFromMap.neighboursIds : clusterFromMap.neighboursIds;
        for (const neighbourId of neighboursIds) {
          var neighbour = window.boxesMap.get(neighbourId) || window.clustersMap.get(neighbourId);

          var neighbourDiv = document.getElementById(neighbourId); 
          neighbourDiv.style.backgroundColor = neighbour.oldColor;
          neighbourDiv.innerText = "";
        }
      }
    }

    function convertEntitiesToDivs(entities) {

      for (const entity of entities) {
        if(entity.type == 0) { /* Box */
          window.boxesMap.set(entity.id, entity);
        } else if(entity.type == 1) { /* Cluster */
          window.clustersMap.set(entity.id, entity);
        }
        let div = document.createElement('div');
        div.id = entity.id;
        div.style.top = `${entity.top}px`;
        div.style.left = `${entity.left}px`;
        div.style.height = `${entity.height}px`;
        div.style.width = `${entity.width}px`;
        div.style.position = 'absolute';
        div.style.zIndex = entity.type == 0 ? 100 : 200;
        div.style.backgroundColor = entity.color;
        div.style.opacity = entity.type == 0 ? 1.0 : 0.4;
        div.addEventListener('mouseenter', handleMouseHoverEvent);
        div.addEventListener('mouseleave', handleMouseHoverEvent);
        document.body.appendChild(div);
      }
    }
    
  }, data);

  await page.screenshot({path: './output/rendered.png', fullPage: true});
  // await browser.close();
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

function convertEntityForVizualizer(entity) {
  var vizEntity = {};
  vizEntity.left = entity.left;
  vizEntity.top = entity.top;
  vizEntity.right = entity.right;
  vizEntity.bottom = entity.bottom;
  /* If width, height and color are null - entity is cluster */
  vizEntity.width = entity.width || entity.right - entity.left;
  vizEntity.height = entity.height || entity.bottom - entity.top;
  vizEntity.color = entity.color || "#29e";
  vizEntity.oldColor = entity.color || "#29e";
  vizEntity.id = entity.id;
  vizEntity.type = entity.type;
  vizEntity.neighboursIds = Array.from(entity.neighbours.keys()).map(n => n.id);

  var neighboursIdsAndRelationsIds = [];
  for (const [neighbour, relation] of entity.neighbours.entries()) {
      neighboursIdsAndRelationsIds.push({neighbourId:neighbour.id, relationId: relation.id, similarity: relation.similarity});
  }
  vizEntity.neighboursIdsAndRelationsIds = neighboursIdsAndRelationsIds;

  if(entity.type == EntityType.cluster) {
      vizEntity.boxesIds = Array.from(entity.boxes.keys());
  }

  return vizEntity;
};
  
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

module.exports = {vizualize, vizualizeStep, convertEntityForVizualizer, buildHtmlTemplate};
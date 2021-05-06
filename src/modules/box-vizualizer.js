/**
 * Project: Box Clustering Segmentation in Node.js
 * Author: Tomas Zubrik, xzubri00@stud.fit.vutbr.cz
 * Year: 2021
 * License:  GNU GPLv3
 * Description: Box Vizualizer for vizualizing boxes, its neighbours and clusters
 */

const { chromium } = require('playwright');
const { EntityType } = require('../structures/EntityType');

/* Expect boxes and clusters data */
function vizualizeStep(data, iteration) {

  data.iteration = iteration;

  startBoxVizualizer(data);
}

/* Start Box vizualizer */
const startBoxVizualizer = async (data) => {

  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  page.on('close', () => browser.close());

  page
    .on('console', message => console.log(`${message.type().substr(0, 3).toUpperCase()} ${message.text()}`))
    .on('pageerror', ({ message }) => console.log(message))
    .on('requestfailed', request => console.log(`${request.failure().errorText} ${request.url()}`))

  await page.setViewportSize({
    width: data.pageDims.width,
    height: data.pageDims.height
  });

  await page.setContent(buildHtmlTemplate());

  /* Evaluate in browser context with loaded data from filesystem */
  await page.evaluate(async (data) => {

    window.boxesMap = new Map();
    window.clustersMap = new Map();
    window.relationsList = data.relations;

    document.body.style.height = `${data.pageDims.height + 500}px`;
    
    data.bestRel ? (window.bestRel = data.bestRel) : null;

    convertEntitiesToDivs(data.boxes);
    convertEntitiesToDivs(data.clusters ? data.clusters : []);

    var relAId, relBId;
    if (data.bestRel) {
      relAId = data.bestRel.entityAId;
      relBId = data.bestRel.entityBId;

      window.boxesMap.has(relAId) ? window.boxesMap.get(relAId).oldColor = "#FF1600" : null;
      window.boxesMap.has(relBId) ? window.boxesMap.get(relBId).oldColor = "#FF1600" : null;

      window.clustersMap.has(relAId) ? window.clustersMap.get(relAId).oldColor = "#FF1600" : null
      window.clustersMap.has(relBId) ? window.clustersMap.get(relBId).oldColor = "#FF1600" : null;

      document.getElementById(relAId).style.backgroundColor = "#FF1600";
      document.getElementById(relBId).style.backgroundColor = "#FF1600";
    }

    function handleMouseHoverEvent(event) {
      var boxFromMap = window.boxesMap.get(event.target.id);
      var clusterFromMap = window.clustersMap.get(event.target.id);

      if (event.type === "mouseenter") {
        event.target.style.backgroundColor = '#FFFF00';
        var neighboursIdsAndRelationsIds = boxFromMap ? boxFromMap.neighboursIdsAndRelationsIds : clusterFromMap.neighboursIdsAndRelationsIds;

        for (const entry of neighboursIdsAndRelationsIds) {
          var neighbourDiv = document.getElementById(entry.neighbourId);
          neighbourDiv.style.backgroundColor = '#FF00FF';
          neighbourDiv.innerText = `${entry.similarity.toFixed(3)}  ${window.relationsList.includes(entry.relationId)}`;
        }

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
        if (entity.type == 0) { /* Box */
          window.boxesMap.set(entity.id, entity);
        } else if (entity.type == 1) { /* Cluster */
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
  var eViz = {};
  eViz.left = entity.left;
  eViz.top = entity.top;
  eViz.right = entity.right;
  eViz.bottom = entity.bottom;
  /* If width, height and color are null - entity is cluster */
  eViz.width = entity.width || entity.right - entity.left;
  eViz.height = entity.height || entity.bottom - entity.top;
  eViz.color = entity.color || "#29e";
  eViz.oldColor = entity.color || "#29e";
  eViz.id = entity.id;
  eViz.type = entity.type;
  eViz.neighboursIds = Array.from(entity.neighbours.keys()).map(n => n.id);

  var neighboursIdsAndRelationsIds = [];
  for (const [neighbour, relation] of entity.neighbours.entries()) {
    neighboursIdsAndRelationsIds.push({ neighbourId: neighbour.id, relationId: relation.id, similarity: relation.similarity });
  }
  eViz.neighboursIdsAndRelationsIds = neighboursIdsAndRelationsIds;

  if (entity.type == EntityType.cluster) {
    eViz.boxesIds = Array.from(entity.boxes.keys());
  }

  return eViz;
};

module.exports = { vizualizeStep, convertEntityForVizualizer, buildHtmlTemplate };
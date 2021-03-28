/**
 * Project: Box ClusteringManager Segmentation in Node.js
 * Author: Tomas Zubrik, xzubri00@stud.fit.vutbr.cz
 * Year: 2021
 * License:  GNU GPLv3
 * Description: Main function program block
 */

const sort = require('fast-sort');
const vizualizer = require('./box-vizualizer');
const Cluster = require('../structures/Cluster');
const RTree = require('../structures/RTree');
const Relation = require('../structures/Relation');
const { Selector, SelectorDirection } = require('../structures/Selector');

module.exports.process = process;

class ClusteringManager {

    constructor(extracted) {

        /* Won't be changed */
        this.pageDims = {
            height: extracted.document.height,
            width: extracted.document.width
        };
        
        /* Dynamically changed throughout the segmentation process */
        this.boxes = extracted.boxes; 
        this.tree = this.createRTree();
        this.relations = {};
        this.clusters = {};
    }

    createRTree() {
        const tree = new RTree();
        tree.load(Object.values(this.boxes));
        return tree;
    }

    removeContainers() {
        var boxes = Object.values(this.boxes);
        var selector, inside, box;
    
        for (let i = 0; i < boxes.length; i++) {
            box = boxes[i];
            selector = {minX: box.left+1, minY: box.top+1, maxX: box.right-1, maxY: box.bottom-1};
            inside = this.tree.search(selector);
            if(inside.length > 2) { //maybe bigger overlays
                delete this.boxes[box.id];
                this.tree.remove(box);
            }
        }
    
        boxes = Object.values(this.boxes);
        for (let i = 0; i < boxes.length; i++) {
            box = boxes[i];
            selector = {minX: box.left+1, minY: box.top+1, maxX: box.right-1, maxY: box.bottom-1};
            inside = this.tree.search(selector);
            if(inside.length > 1) { //maybe bigger overlays
                this.boxes[box.id];
                this.tree.remove(box);
            }
        }
    }

    findAllRelations() {
        var box, boxes = Object.values(this.boxes);
        var boxesCount = boxes.length;
    
        for (let i = 0; i < boxesCount; i++) {
            box = boxes[i];
            box.findDirectNeighbours(this, SelectorDirection.right);    
            box.findDirectNeighbours(this, SelectorDirection.down);
            box.findDirectNeighbours(this, SelectorDirection.left);
            box.findDirectNeighbours(this, SelectorDirection.up);
            this.boxes[box.id] = box;
        }
    
        var relations = Object.values(this.relations);
        for (let i = 0; i < relations.length; i++) {
            var rel = relations[i];
            rel.calculateRelativeDistance();
            rel.calculateShapeSimilarity();
            rel.calculateColorSimilarity();
            rel.calculateBaseSimilarity();
            this.relations[rel.id] = rel;
            this.boxes[rel.entityA.id].relations[rel.id] = rel;
        }
        // console.log(Object.values(this.relations)[0]);
    }

    addMethodForEveryBox() {
        var boxes = Object.values(this.boxes);

        boxes.forEach(box => {
            box.findDirectNeighbours = findDirectNeighbours;
        });
    }

    createClusters() {

        var rel, relations = Object.values(this.relations);
        sort(relations).asc(rel => rel.similarity);

        /* Main Clustering Loop */

        while(relations.length > 0) {
            rel = relations[0];
    
            /* Remove the first element from an array, while changes array in place */
            relations.shift();
        
            if(rel.similarity > 0.5) {
                continue;
            }
    
            var clusterCandidate = new Cluster(rel.entityA, rel.entityB);
            clusterCandidate.getOverlappingEntities(this.tree);
    
            if(clusterCandidate.overlapsAnyCluster()) {
                continue;
            }
    
            if(clusterCandidate.overlapsAnyBox()) { 
                console.log("Cluster", clusterCandidate.id, "overlaps some other box!");
                break;
            } 
              
            // clusterCandidate.removeBoxesFromUnclusteredSet();
            // clusterCandidate.recalculateNeighbours();
            // clusterCandidate.commit();
            // console.log(Object.values(clusterCandidate.neighbours).map(n => n.id));


            this.recalcNeighbours(clusterCandidate, rel);
            this.clusters[clusterCandidate.id] = clusterCandidate;

            /* CREATE JUST FIRST CLUSTER AND QUIT !!!!!!! */
            break;
            
        }
    }

    recalcNeighbours(cc, rel) {

    }
}

function findDirectNeighbours(cm, direction) {
    var tree = cm.tree;
    var box = this;

    var selector, neighbours = [];

    const pageWidth = cm.pageDims.width;
    const pageHeight = cm.pageDims.height;

    const selectorWidth = 100;
    const selectorHeight = 50;

    if(direction == SelectorDirection.right){
        for (let maxX = box.right + 1 + selectorWidth; maxX < pageWidth + selectorWidth; maxX+=selectorWidth) {
            
            selector = new Selector(box.right+1, box.top+1, maxX, box.bottom-1);
            neighbours = tree.search(selector);    

            if(neighbours.length) {
                break;
            }
        }
    } else if (direction == SelectorDirection.down) {
        for (let maxY = box.bottom + 1 + selectorHeight; maxY < pageHeight + selectorHeight; maxY+=selectorHeight) {
        
            selector = new Selector(box.left+1, box.bottom+1, box.right-1, maxY);
            neighbours = tree.search(selector);    
    
            if(neighbours.length) {
                break;
            }
        }
    } else if (direction == SelectorDirection.left) {
        for (let minX = box.left - 1 - selectorWidth; minX > 0 - selectorWidth; minX-=selectorWidth) {
        
            selector = new Selector(minX, box.top + 1, box.left-1 , box.bottom-1);
            neighbours = tree.search(selector);    
    
            if(neighbours.length) {
                break;
            }
        }
    } else if (direction == SelectorDirection.up) {
        for (let minY = box.top - 1 - selectorHeight; minY > 0 - selectorHeight; minY-=selectorHeight) {
        
            selector = new Selector(box.left + 1, minY, box.right - 1, box.top - 1);
            neighbours = tree.search(selector);    
    
            if(neighbours.length) {
                break;
            }
        }
    }

    var tmpRelations = [], shortestDistance = pageWidth + pageHeight;
    var rel;
    for (let i = 0; i < neighbours.length; i++) {
        rel = new Relation(box, neighbours[i], direction);

        if(rel.absoluteDistance < shortestDistance) {
            tmpRelations.push(rel);
            shortestDistance = rel.absoluteDistance;
        }
    }

    for (let i = 0; i < tmpRelations.length; i++) {
        rel = tmpRelations[i];
        
        cm.relations[rel.id] = rel;
        box.relations[rel.id] = rel;
        box.neighbours[rel.entityB.id] = rel.entityB;

        if(rel.absoluteDistance == shortestDistance) {

            if(rel.absoluteDistance > box.maxNeighbourDistance) {
                box.maxNeighbourDistance = rel.absoluteDistance;
            }
        }
      }
  }


function process(extracted) {

    cm = new ClusteringManager(extracted);
    cm.removeContainers();
    cm.addMethodForEveryBox();
    cm.findAllRelations();

    var boxes = Object.values(cm.boxes);

    for (let i = 0; i < boxes.length; i++) {
        if(i == 0){
            // console.log(boxes[i].color, Object.values(boxes[i].neighbours).length);
            // console.log(boxes[i]);
        }
    }

    cm.createClusters();
    vizualizer.createSvgRepresentation({boxes: extracted.boxes, document: extracted.document, clusters: cm.clusters});
}
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
        
        // this.boxes = extracted.boxes; 
        this.entities = new Map(Object.entries(extracted.boxes)); // entityId => entity
        this.relations = new Map();

        /* Dynamically changed throughout the segmentation process */
        this.tree = this.createRTree();
    }

    createRTree() {
        const tree = new RTree();
        tree.load(Array.from(this.entities.values()));
        return tree;
    }

    removeContainers() {
        var selector, overlapping;
    
        for (let box of this.entities.values()) {
            selector = (new Selector(box.left, box.top, box.right, box.bottom)).narrowBy1Px();
            overlapping = this.tree.search(selector);
            if(overlapping.length > 2) { 
                this.entities.delete(box.id);
                this.tree.remove(box);
            }
        }

        for (let box of this.entities.values()) {
            selector = (new Selector(box.left, box.top, box.right, box.bottom)).narrowBy1Px();
            overlapping = this.tree.search(selector);
            if(overlapping.length > 1) { 
                this.entities.delete(box.id);
                this.tree.remove(box);
            }
        }
    }

    findAllRelations() {
    
        for (let box of this.entities.values()) {
            box.findDirectNeighbours(this, SelectorDirection.right);    
            box.findDirectNeighbours(this, SelectorDirection.down);
            box.findDirectNeighbours(this, SelectorDirection.left);
            box.findDirectNeighbours(this, SelectorDirection.up);
        }

        for (let box of this.entities.values()) {
            for (let relation of box.neighbours.values()) {
                relation.calculateRelativeDistance();
                relation.calculateShapeSimilarity();
                relation.calculateColorSimilarity();
                relation.calculateBaseSimilarity();
                this.relations.set(relation.id, relation);
            }
        }
    }

    enhanceEveryBox() {

        for (let box of this.entities.values()) {
            box.findDirectNeighbours = findDirectNeighbours;
            box.neighbours = new Map();
        }
    }

    createClusters() {

        var rel, relations = Array.from(this.relations.values());
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
              
            // this.recalcNeighbours(clusterCandidate, rel);
            clusterCandidate.assignBoxes(rel.entityA, rel.entityB);

            this.recalcNeighbours(clusterCandidate);

            this.entities.set(clusterCandidate.id, clusterCandidate);

            /* CREATE JUST FIRST CLUSTER AND QUIT !!!!!!! */
            break;
            
        }
    }

    recalcNeighbours(cc) {

        var m = new Map();

        for (const box of cc.boxes.values()) {
            for (const neighbour of box.neighbours.keys()) { // namiesto FORALL!!!
                if(!cc.boxes.has(neighbour.id)) {
                    console.log(neighbour.id);
                    m.set(neighbour.id, m.has(neighbour.id) ? m.get(neighbour.id)+1 : 1);
                }
            }
        }

        console.log(m);
        // /* Get ID of first entity in relation */
        // var entityAId = rel.entityA.id;

        // /* Get ID of second entity in relation */
        // var entityBId = rel.entityB.id;

        // /* Delete each others' neighbour  */
        // delete this.boxes[entityAId].neighbours[entityBId];
        // delete this.boxes[entityBId].neighbours[entityAId];

        // /* Get  */
        // var neighboursIdsA = Object.keys(this.boxes[entityAId].neighbours);
        // var neighboursIdsB = Object.keys(this.boxes[entityBId].neighbours);

        // neighboursIdsA.forEach(neighbourId => {
        //     cc.neighbours[neighbourId] = this.boxes[neighbourId];
        //     this.boxes[neighbourId].neighbours[cc.id] = cc;
        // });

        // neighboursIdsB.forEach(neighbourId => {
        //     cc.neighbours[neighbourId] = this.boxes[neighbourId];
        //     this.boxes[neighbourId].neighbours[cc.id] = cc;
        // });

        // var neighboursIdsCC = Object.keys(cc.neighbours);

        // this.boxes[entityAId].neighbours[cc.id] = cc;
        // this.boxes[entityBId].neighbours[cc.id] = cc;

        // console.log(neighboursIdsA);
        // console.log(neighboursIdsB);
        // console.log(neighboursIdsCC);

    }

    vizualize() {
        var clusters = [], boxes = [];
        for (const entity of this.entities.values()) {
            if(entity.type == 'box') boxes.push(entity);
            if(entity.type == 'cluster') clusters.push(entity);
        }
        vizualizer.createSvgRepresentation({
            boxes: boxes, 
            clusters: clusters,
            document: {
                width: this.pageDims.width,
                height: this.pageDims.height
            }
        });
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

    for (const neighbour of neighbours) {
        var rel = new Relation(box, neighbour, direction);
        if(rel.absoluteDistance < shortestDistance) {
            tmpRelations.push(rel);
            shortestDistance = rel.absoluteDistance;
        }
    }

    for (const rel of tmpRelations) {
        if(rel.absoluteDistance == shortestDistance) {
            box.neighbours.set(rel.entityB, rel);
            if(rel.absoluteDistance > box.maxNeighbourDistance) {
                box.maxNeighbourDistance = rel.absoluteDistance;
            }
        }
    }
  }

function process(extracted) {

    var cm = new ClusteringManager(extracted);
    cm.removeContainers();
    cm.enhanceEveryBox();
    cm.findAllRelations();
    cm.createClusters();

    cm.vizualize();
}
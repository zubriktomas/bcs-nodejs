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
const { EntityType, isBox, isCluster } = require('../structures/EntityType');

module.exports.process = process;


class ClusteringManager {

    constructor(extracted) {

        /* Won't be changed */
        this.pageDims = {
            height: extracted.document.height,
            width: extracted.document.width
        };
        
        this.extractedBoxes = new Map(Object.entries(extracted.boxes));
        this.boxes = new Map(Object.entries(extracted.boxes)); // entityId => entity
        this.clusters = new Map();
        this.relations = new Map();

        /* Dynamically changed throughout the segmentation process */
        this.tree = this.createRTree();
    }

    createRTree() {
        const tree = new RTree();
        tree.load(Array.from(this.boxes.values()));
        return tree;
    }

    removeContainers() {
        var selector, overlapping;
    
        for (let box of this.boxes.values()) {
            selector = (new Selector(box.left, box.top, box.right, box.bottom)).narrowBy1Px();
            overlapping = this.tree.search(selector);
            if(overlapping.length > 2) { 
                this.boxes.delete(box.id);
                this.tree.remove(box);
            }
        }

        for (let box of this.boxes.values()) {
            selector = (new Selector(box.left, box.top, box.right, box.bottom)).narrowBy1Px();
            overlapping = this.tree.search(selector);
            if(overlapping.length > 1) { 
                this.boxes.delete(box.id);
                this.tree.remove(box);
            }
        }
    }

    findAllRelations() {
    
        for (let box of this.boxes.values()) {
            box.findDirectNeighbours(this, SelectorDirection.right);    
            box.findDirectNeighbours(this, SelectorDirection.down);
            box.findDirectNeighbours(this, SelectorDirection.left);
            box.findDirectNeighbours(this, SelectorDirection.up);
        }

        for (let relation of this.relations.values()) {
            relation.calcSimilarity();
        }
    }

    enhanceEveryBox() {

        for (let box of this.boxes.values()) {
            box.findDirectNeighbours = findDirectNeighbours;
            box.hasDirectNeighbour = function (otherBox) {
                return box.neighbours.has(otherBox.id);
            };
            box.neighbours = new Map();
            box.boxes = new Map();
            box.toString = toString;
        }
    }

    getBestRelation() {
        var sim = 1, bestRel;
        for (const rel of this.relations.values()) {
            if(rel.similarity <= sim ) {
                sim = rel.similarity;
                bestRel = rel;
            }
        }
        return bestRel;
    }

    createClusters() {

        // var rel, relations = Array.from(this.relations.values());
        // sort(relations).asc(rel => rel.similarity);

        /* Main Clustering Loop */
        var rel;
        while(this.relations.size > 0) {

            rel = this.getBestRelation();

            // for (const rel of this.relations.values()) {
            //     console.log(rel.similarity);
            // }
                
            if(rel.similarity > 0.5) {
                console.log("Attention: rel.similarity > 0.5");
                // console.log(rel.id);
                break;
            }
            
            var cc = new Cluster(rel.entityA, rel.entityB);
            var overlapping = cc.getOverlappingEntities(this.tree);
            
            if(cc.overlapsAnyCluster(overlapping)) {
                console.log("CC overlaps any cluster");
                break;
            }
            
            if(cc.overlapsAnyBox(overlapping)) { 
                console.log("Cluster", cc.id, "overlaps some other box!, what to do now? ");
                break;
            } 
            
            cc.addBoxes(rel.entityA);
            cc.addBoxes(rel.entityB);
            
            this.recalcBoxes(rel);
            this.recalcClusters(rel);
            
            this.updateRTree(cc, rel);
            
            this.recalcNeighboursAndRelations(cc);
            
            this.clusters.set(cc.id, cc);
            
            // console.log();
            // for (const rel of this.relations.values()) {
            //     console.log(rel.toString());
            // }

            break;
        }

    }

    updateRTree(cc, rel) {
        var entityA, entityB;

        entityA = rel.entityA;
        entityB = rel.entityB;

        if(isCluster(entityA)) {
            this.tree.remove(entityA);
        }

        if(isCluster(entityB)) {
            this.tree.remove(entityB);
        }

        this.tree.insert(cc);
    }

    recalcBoxes(rel) {

        // If entity is cluster, delete has no effect
        this.boxes.delete(rel.entityA.id);                       
        this.boxes.delete(rel.entityB.id);
    }

    recalcClusters(rel) {
        // If entity is box, delete has no effect
        this.clusters.delete(rel.entityA.id);
        this.clusters.delete(rel.entityB.id);
    }

    // recalcRelations(rel) {

    //     for (const relation of rel.entityA.neighbours.values()) {
    //         this.relations.delete(relation.id);
    //     }

    //     for (const relation of rel.entityB.neighbours.values()) {
    //         this.relations.delete(relation.id);
    //     }
    // }

    recalcNeighboursAndRelations(cc) {

        cc.addNeighboursAndRelations();

        for (const [ccNeighbour, ccRel] of cc.neighbours.entries()) {
            ccNeighbour.neighbours.set(cc, ccRel);
            this.relations.set(ccRel.id, ccRel);
        }

        for (const box of cc.boxes.values()) {
            for (const bRelation of box.neighbours.values()) {
                this.relations.delete(bRelation.id);
            }
        }

    }

    vizualize() {
        var clusters = [], boxes = [];

        for (const box of this.extractedBoxes.values()) {
            boxes.push(box);
        }

        for (const cluster of this.clusters.values()) {
            clusters.push(cluster);
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

    toString() {
        var cmString = `\n |B|: ${this.boxes.size}\n |C|: ${this.clusters.size}\n |R|: ${this.relations.size}\n`;
        return cmString;
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

            cm.relations.set(rel.id, rel);
            box.neighbours.set(rel.entityB, cm.relations.get(rel.id));

            if(rel.absoluteDistance > box.maxNeighbourDistance) {
                box.maxNeighbourDistance = rel.absoluteDistance;
            }
        }
    }
  }

function toString() {
    var boxString = `\n Box: ${this.color} \n |Neighbours|: ${this.neighbours.size}`;
    return boxString;
}

function process(extracted) {

    var cm = new ClusteringManager(extracted);
    cm.removeContainers();
    cm.enhanceEveryBox();
    cm.findAllRelations();
    cm.createClusters();
    cm.vizualize();
}
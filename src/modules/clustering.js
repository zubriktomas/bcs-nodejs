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

const iterationExceeded = (i) => {return i > 50};
const isBetweenClusters = (rel) => {return isCluster(rel.entityA) && isCluster(rel.entityB);};

class ClusteringManager {

    constructor(extracted) {

        /* Won't be changed */
        this.pageDims = {
            height: extracted.document.height,
            width: extracted.document.width
        };
        this.extractedBoxes = new Map(Object.entries(extracted.boxes));

        this.clusteringThreshold = null;
        this.densityThreshold = null;

        /* Dynamically changed throughout the segmentation process */
        this.boxes = new Map(Object.entries(extracted.boxes)); // entityId => entity
        this.clusters = new Map();
        this.relations = new Map();
        this.tree = this.createRTree();

        this.cc = null;
    }

    createRTree() {
        const tree = new RTree();
        tree.load(Array.from(this.boxes.values()));
        return tree;
    }

    removeContainers() {
        var selector, overlapping;
    
        for (let box of this.boxes.values()) {
            selector = Selector.fromEntity(box);
            overlapping = this.tree.search(selector.narrowBy1Px());
            if(overlapping.length > 2) { 
                this.boxes.delete(box.id);
                this.tree.remove(box);
            }
        }

        for (let box of this.boxes.values()) {
            selector = Selector.fromEntity(box);
            overlapping = this.tree.search(selector.narrowBy1Px());
            if(overlapping.length > 1) { 
                this.boxes.delete(box.id);
                this.tree.remove(box);
            }
        }
    }

    findAllRelations() {

        const pageContents = this.pageDims.width * this.pageDims.height;
        var allBoxesContents = 0;
        const calcContents = (entity) => {return (entity.right - entity.left ) * (entity.bottom - entity.top);};
        for (let box of this.boxes.values()) {
            box.findDirectNeighbours(this, SelectorDirection.right);
            box.findDirectNeighbours(this, SelectorDirection.down);
            box.findDirectNeighbours(this, SelectorDirection.left);
            box.findDirectNeighbours(this, SelectorDirection.up);
            allBoxesContents += calcContents(box);
        }

        var r = 0;
        for (let relation of this.relations.values()) {
            relation.calcSimilarity();
            r += relation.similarity;
        }

        // this.clusteringThreshold = r / this.relations.size;
        this.clusteringThreshold = 0.2;
        this.densityThreshold = allBoxesContents/pageContents;
        console.log("DENSITY THRESHOLD = BOXES CONTENTS/PAGE CONTENTS =", this.densityThreshold);
        console.log("CLUSTERING THRESHOLD = REL SIM/REL COUNT = ", this.clusteringThreshold);
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
        var sim = Number.MAX_SAFE_INTEGER, bestRel;

        for (const rel of this.relations.values()) {
            if(rel.similarity <= sim ) {
                sim = rel.similarity;
                bestRel = rel;
            }
        }
        return bestRel;
    }

    assert(condition, message) {
        if (!condition){
        //   throw Error('Test failed: ' + (message || ''));
            console.log('Test failed: ' + (message || ''));
        }
      }

    getRelEntitiesTypes(rel){
        var out = "";
        out += isCluster(rel.entityA) ? "C " : "B ";
        out += isCluster(rel.entityB) ? "C" : "B";
        return out;
    }

    assignForVizualization(cc, rel) {
        this.cc = cc;
        this.entityA = rel.entityA;
        this.entityB = rel.entityB;
    }

    createClusters() {
        var rel;
        var i=0;

        // for (let i = 0; i < 50; i++) {
        while(this.relations.size > 0) {
            i++;
            rel = this.getBestRelation();

            this.relations.delete(rel.id);

            if(rel.similarity > this.clusteringThreshold) {
                console.log(`Similarity > ${this.clusteringThreshold}, THE END`);
                console.log(rel.similarity);
                break;
            } else {
                console.log(rel.similarity);
            }

            var cc = new Cluster(rel.entityA, rel.entityB);

            if(isBetweenClusters(rel) && iterationExceeded(i)) {
                console.log("isBetweenClusters:", rel.similarity.toFixed(2), "i:", i);
                this.assignForVizualization(rel);
                break;
            }

            if(this.overlaps(cc, rel)) {
                continue;
            }

            if(iterationExceeded(i)) {
                this.assignForVizualization(cc, rel);
                break;
            }

            // this.mergeOverlaps(cc);

            this.recalcBoxesAndClusters(cc); 
            this.recalcNeighboursAndRelations(cc);
            this.clusters.set(cc.id, cc);
        }

        // console.log("THIS RELATIONS SIZE:");
        // console.log(this.relations.size);
        // var rrr = Array.from(this.relations.values()).filter(rel => rel.similarity == 1 && isCluster(rel.entityA) && isCluster(rel.entityB));

        // for (let i = 0; i < rrr.length; i++) {
        //     var rel = rrr[i];

        //     var cc = new Cluster(rel.entityA, rel.entityB);
        //     if(this.overlaps(cc, rel)) {
        //         continue;
        //     }
        //     this.recalcBoxesAndClusters(cc); 
        //     this.recalcNeighboursAndRelations(cc);
        //     this.clusters.set(cc.id, cc);
        // }


        // var rrr = Array.from(this.relations.values()).filter(rel => rel.similarity == 1 && isCluster(rel.entityA) && isCluster(rel.entityB));
        // console.log(rrr);

        // console.log(rrr.map(rel=>rel.similarity));

        // var rel = rrr[1];

        // var cc = new Cluster(rel.entityA, rel.entityB);
        // this.cc = cc;
        // this.cc = rel.entityA;
        // this.cc = rel.entityB;

    }

    densityOverThreshold(cc) {
        const calcContents = (entity) => {return (entity.right - entity.left ) * (entity.bottom - entity.top);};
        var ccContents = calcContents(cc);

        var ccBoxesContents = 0;
        for (const b of cc.boxes.values()) {
            ccBoxesContents += calcContents(b);
        }

        return ccBoxesContents/ccContents >= this.densityThreshold;
    }

    mergeOverlaps(cc) {

        var overlapping, ob, oc, ommitClusters = new Map();

        do {
            overlapping = cc.getOverlappingEntities(this.tree);
            ob = overlapping.filter(entity => isBox(entity) && !cc.boxes.has(entity.id) && this.boxes.has(entity.id));
            oc = overlapping.filter(entity => isCluster(entity) && !ommitClusters.has(entity.id) );

            for (let i = 0; i < ob.length; i++) {
                cc.addBoxes(ob[i]);
            }
    
            for (let i = 0; i < oc.length; i++) {
                cc.addBoxes(oc[i]);
                ommitClusters.set(oc[i].id, oc[i]);
            }

        } while (!this.densityOverThreshold(cc));


    }



    overlaps(cc, rel) {
        // var ob = overlapping.filter(entity => isBox(entity) && !(this.boxes.has(entity.id)) && entity.id != rel.entityA.id && entity.id != rel.entityB.id);
        var overlapping = cc.getOverlappingEntities(this.tree);
        var ob = overlapping.filter(entity => isBox(entity) && !(cc.boxes.has(entity.id)) && this.boxes.has(entity.id));
        var oc = overlapping.filter(entity => isCluster(entity));

        var ommitClusters = new Map();

        for (let i = 0; i < ob.length; i++) {
            cc.addBoxes(ob[i]);
        }

        for (let i = 0; i < oc.length; i++) {
            cc.addBoxes(oc[i]);
            ommitClusters.set(oc[i].id, oc[i]);
        }

        overlapping = cc.getOverlappingEntities(this.tree);
        // ob = overlapping.filter(entity => isBox(entity) && !cc.boxes.has(entity.id));
        var ob = overlapping.filter(entity => isBox(entity) && !(cc.boxes.has(entity.id)) && this.boxes.has(entity.id));

        for (let i = 0; i < ob.length; i++) {
            cc.addBoxes(ob[i]);
        }

        overlapping = cc.getOverlappingEntities(this.tree);
        oc = overlapping.filter(entity => isCluster(entity) && !ommitClusters.has(entity.id));
        // ob = overlapping.filter(entity => isBox(entity) && !cc.boxes.has(entity.id));
        var ob = overlapping.filter(entity => isBox(entity) && !(cc.boxes.has(entity.id)) && this.boxes.has(entity.id));

        // return ob.length || oc.length;
        return ob.length || oc.length;//|| !this.densityOverThreshold(cc);

        // for (const box of this.boxes.values()) {
        //     if(!cc.boxes.has(box.id) && cc.containsVisually(box)) {
        //         return true;
        //     }
        // }

        // for (const cluster of this.clusters.values()) {
        //     if(!ommitClusters.has(cluster.id)) {
        //         if(cc.containsVisually(cluster)) {
        //             return true;
        //         }
        //     }
        // }

        // for (const cluster of ommitClusters.values()) {
        //     this.clusters.delete(cluster.id);
        //     this.tree.remove(cluster);
        // }

        return "break";


    }

    recalcBoxesAndClusters(cc) {

        for (const box of cc.boxes.values()) {
            this.boxes.delete(box.id);

            if(box.cluster) {
                this.clusters.delete(box.cluster.id);
                for (const cRel of box.cluster.neighbours.values()) {
                    this.relations.delete(cRel.id);
                }
                this.tree.remove(box.cluster);
            }
        }
        this.tree.insert(cc);
    }

    recalcNeighboursAndRelations(cc) {

        var relDelList = cc.addNeighboursAndRelations();

        for (const [ccNeighbour, ccRel] of cc.neighbours.entries()) {
            this.relations.set(ccRel.id, ccRel);

            if(isCluster(ccNeighbour)) {
                ccNeighbour.neighbours.set(cc, ccRel);
            }
        }

        for (const relToDel of relDelList.keys()) {
            this.relations.delete(relToDel);
        }
    }

    vizualize() {

        console.log(this.extractedBoxes.size);

        vizualizer.createSvgRepresentation({
            boxes: this.extractedBoxes ? this.extractedBoxes.values() : null,
            clusters: this.clusters ? this.clusters.values() : null,
            cc: this.cc ? this.cc : null,
            entityA: this.entityA ? this.entityA : null,
            entityB: this.entityB ? this.entityB : null,
            neighbours: this.neighbours ? this.neighbours.keys() : null,
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

        for (let maxX = box.right + selectorWidth; maxX < pageWidth + selectorWidth; maxX+=selectorWidth) {

            selector = new Selector(box.right, box.top, maxX, box.bottom);
            neighbours = tree.search(selector.narrowBy1Px());

            if(neighbours.length) {
                break;
            }
        }
    } else if (direction == SelectorDirection.down) {
        for (let maxY = box.bottom + selectorHeight; maxY < pageHeight + selectorHeight; maxY+=selectorHeight) {

            selector = new Selector(box.left, box.bottom, box.right, maxY);
            neighbours = tree.search(selector.narrowBy1Px());

            if(neighbours.length) {
                break;
            }
        }
    } else if (direction == SelectorDirection.left) {
        for (let minX = box.left - selectorWidth; minX > 0 - selectorWidth; minX-=selectorWidth) {

            selector = new Selector(minX, box.top, box.left, box.bottom);
            neighbours = tree.search(selector.narrowBy1Px());

            if(neighbours.length) {
                break;
            }
        }
    } else if (direction == SelectorDirection.up) {
        for (let minY = box.top - selectorHeight; minY > 0 - selectorHeight; minY-=selectorHeight) {

            selector = new Selector(box.left, minY, box.right, box.top);
            neighbours = tree.search(selector.narrowBy1Px());

            if(neighbours.length) {
                break;
            }
        }
    }

    var tmpRelations = [], shortestDistance = Number.MAX_SAFE_INTEGER;

    for (const neighbour of neighbours) {
        var rel = new Relation(box, neighbour, direction);
        tmpRelations.push(rel);
        if(rel.absoluteDistance < shortestDistance) {
            shortestDistance = rel.absoluteDistance;
        }
    }

    for (const rel of tmpRelations) {
        if(rel.absoluteDistance == shortestDistance) {

            if(!cm.relations.has(rel.id)) {
                cm.relations.set(rel.id, rel);
            }
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
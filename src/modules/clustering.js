/**
 * Project: Box Clustering Segmentation in Node.js
 * Author: Tomas Zubrik, xzubri00@stud.fit.vutbr.cz
 * Year: 2021
 * License:  GNU GPLv3
 * Description: Main clustering process (segmentation logic) of method BCS 
 */

const { writeFileSync } = require('fs');
const vizualizer = require('./box-vizualizer');
const Box = require('../structures/Box');
const Cluster = require('../structures/Cluster');
const RTree = require('../structures/RTree');
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

        /* Won't be changed */
        this.clusteringThreshold = 0;
        this.densityThreshold = 0;
        this.allBoxesList = extracted.boxesList;

        /* Dynamically changed throughout the segmentation process */
        // this.boxes = new Map(Object.entries(extracted.boxes)); // BoxId => Box
        this.boxes = this.reinitBoxes(extracted.boxesList);
        this.boxesOk = null;        
        this.tree = this.createRTree(Array.from(this.boxes.values()));
        this.clusters = new Map();
        this.relations = new Map();

        /* Just for vizualization purposes */
        this.cc = null;
    }

    reinitBoxes(boxesList) {
        var boxesMap = new Map();

        for (const box of boxesList) {
            var boxStruct = new Box(box);
            boxesMap.set(boxStruct.id, boxStruct);            
        }
        return boxesMap;
    }

    createRTree(boxesList) {
        const tree = new RTree();
        // tree.load(Array.from(this.boxes.values()));
        tree.load(boxesList);
        return tree;
    }

    removeContainers() {
        var selector, overlapping;
    
        /* Remove bigger containers that contain more than 2 boxes (probably background images) */
        for (let box of this.boxes.values()) {
            selector = Selector.fromEntity(box);
            overlapping = this.tree.search(selector.narrowBy1Px());
            if(overlapping.length > 2) { 
                this.boxes.delete(box.id);
                this.tree.remove(box);
            }
        }

        /* Remove smaller containers now */
        for (let box of this.boxes.values()) {
            selector = Selector.fromEntity(box);
            overlapping = this.tree.search(selector.narrowBy1Px());
            if(overlapping.length > 1) { 
                this.boxes.delete(box.id);
                this.tree.remove(box);
            }
        }

        this.boxesOk = new Map(this.boxes.entries());
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
        this.clusteringThreshold = 0.5;
        this.densityThreshold = allBoxesContents/pageContents;
        // console.log("DENSITY THRESHOLD = BOXES CONTENTS/PAGE CONTENTS =", this.densityThreshold);
        // console.log("CLUSTERING THRESHOLD = REL SIM/REL COUNT = ", this.clusteringThreshold);
    }

    enhanceEveryBox() {

        // for (const boxEntry of this.boxes.entries()) {
        //     this.boxes.set(boxEntry.id, new Box)
        // }

        // for (let box of this.boxes.values()) {
        //     box.findDirectNeighbours = findDirectNeighbours;
        //     box.hasDirectNeighbour = function (otherBox) {
        //         return box.neighbours.has(otherBox.id);
        //     };
        //     box.neighbours = new Map();
        // }
    }

    getBestRelation() {
        var bestRel, sim = Number.MAX_SAFE_INTEGER;

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
        //   throw Error('Error: ' + (message || ''));
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

    createClusters(clusteringThreshold) {
        var rel;
        var i=0;

        // for (let i = 0; i < 50; i++) {
        while(this.relations.size > 0) {
            i++;
            rel = this.getBestRelation();
            // console.log(rel.similarity);
            this.relations.delete(rel.id);
            // continue;

            if(rel.similarity > clusteringThreshold) {
                console.log(`Similarity > ${clusteringThreshold}`, rel.similarity);
                console.log("Number of segments:", this.clusters.size);
                break;
            } 
            // else {
            //     console.log(rel.similarity);
            // }

            var cc = new Cluster(rel.entityA, rel.entityB);

            // if(isBetweenClusters(rel) && iterationExceeded(i)) {
            //     console.log("isBetweenClusters:", rel.similarity.toFixed(2), "i:", i);
            //     this.assignForVizualization(rel);
            //     break;
            // }

            if(this.overlaps(cc, rel)) {
                continue;
            }

            // if(iterationExceeded(i)) {
            //     this.assignForVizualization(cc, rel);
            //     break;
            // }
            // this.mergeOverlaps(cc);

            this.recalcBoxesAndClusters(cc); 
            this.recalcNeighboursAndRelations(cc);
            this.clusters.set(cc.id, cc);
        }
        

        function convertCluster(cluster) {
            var newCluster = {};
            newCluster.left = cluster.left;
            newCluster.top = cluster.top;
            newCluster.right = cluster.right;
            newCluster.bottom = cluster.bottom;
            newCluster.width = cluster.right - cluster.left;
            newCluster.height = cluster.bottom - cluster.top;
            newCluster.type = EntityType.cluster;
            newCluster.segm = 'basic';
            return newCluster;
        }


        var clusters = [];
        for (const cluster of this.clusters.values()) {
            clusters.push(convertCluster(cluster));
        }
    
        var clustersJson = JSON.stringify(clusters);

        writeFileSync('./output/segments.json', clustersJson, (err) => {
            if (err) throw err;
        });
    }

    // densityOverThreshold(cc) {
    //     const calcContents = (entity) => {return (entity.right - entity.left ) * (entity.bottom - entity.top);};
    //     var ccContents = calcContents(cc);

    //     var ccBoxesContents = 0;
    //     for (const b of cc.boxes.values()) {
    //         ccBoxesContents += calcContents(b);
    //     }

    //     return ccBoxesContents/ccContents >= this.densityThreshold;
    // }

    // mergeOverlaps(cc) {
    //     var overlapping, ob, oc, ommitClusters = new Map();
    //     do {
    //         overlapping = cc.getOverlappingEntities(this.tree);
    //         ob = overlapping.filter(entity => isBox(entity) && !cc.boxes.has(entity.id) && this.boxes.has(entity.id));
    //         oc = overlapping.filter(entity => isCluster(entity) && !ommitClusters.has(entity.id) );
    //         for (let i = 0; i < ob.length; i++) {
    //             cc.addBoxes(ob[i]);
    //         }
    //         for (let i = 0; i < oc.length; i++) {
    //             cc.addBoxes(oc[i]);
    //             ommitClusters.set(oc[i].id, oc[i]);
    //         }
    //     } while (!this.densityOverThreshold(cc));
    // }

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

        const convertBoxToBoxVizualize = (box) => {
            var boxVizualize = {};
            boxVizualize.left = box.left;
            boxVizualize.top = box.top;
            boxVizualize.right = box.right;
            boxVizualize.bottom = box.bottom;
            boxVizualize.width = box.width;
            boxVizualize.height = box.height;
            boxVizualize.color = box.color;
            boxVizualize.oldColor = box.color;
            boxVizualize.id = box.id;
            boxVizualize.type = box.type;
            boxVizualize.neighboursIds = Array.from(box.neighbours.keys()).map(n => n.id);
            return boxVizualize;
        };

        var boxesToVizualize = [];
        for (const box of this.boxesOk.values()) {
            boxesToVizualize.push(convertBoxToBoxVizualize(box));
        }

        var data = {
            boxes: boxesToVizualize,
            width: this.pageDims.width,
            height: this.pageDims.height
        };

        vizualizer.vizualize(data);
        // vizualizer.createSvgRepresentation({
        //     boxes: this.boxesOk.values(),
        //     // boxes: this.extractedBoxes ? this.extractedBoxes.values() : null,
        //     // clusters: this.clusters ? this.clusters.values() : null,
        //     cc: this.cc ? this.cc : null,
        //     entityA: this.entityA ? this.entityA : null,
        //     entityB: this.entityB ? this.entityB : null,
        //     neighbours: this.neighbours ? this.neighbours.keys() : null,
        //     document: {
        //         width: this.pageDims.width,
        //         height: this.pageDims.height
        //     }
        // });
    }
}

function exportBoxesToJson(boxesMap) {
    
    function convertBox(box) {
        var newBox = {};
        newBox.left = box.left;
        newBox.top = box.top;
        newBox.right = box.right;
        newBox.bottom = box.bottom;
        newBox.width = box.width
        newBox.height = box.height;
        newBox.color = box.color;
        newBox.type = EntityType.box;
        return newBox;
    }

    var boxesToExport = [];
    for (const box of boxesMap.values()) {
        boxesToExport.push(convertBox(box));
    }

    var boxesJson = JSON.stringify(boxesToExport);

    writeFileSync('./output/boxes.json', boxesJson, (err) => {
        if (err) throw err;
    });

}

function process(extracted, argv) {

    var cm = new ClusteringManager(extracted);
    cm.removeContainers();

    exportBoxesToJson(cm.boxesOk);

    cm.findAllRelations();
    cm.createClusters(argv.CT);

    console.log("allboxes", cm.allBoxesList.length);
    console.log("boxesOk", cm.boxesOk.size);
    console.log("boxesUnclustered", cm.boxes.size);

    cm.vizualize();

}
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
const assert = (condition, message) => { 
    if(!condition) throw Error('Assert failed: ' + (message || ''))
};

class ClusteringManager {

    constructor(extracted, argv) {

        this.argv = argv;

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
        tree.load(boxesList);
        return tree;
    }

    removeContainers() {
        var selector, overlapping;
    
        /* Remove bigger containers that contain more than 2 boxes (probably background images) | elements with absolute position */
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

    createClusters(clusteringThreshold) {
        var rel;
        var i=0;

        // for (let i = 0; i < 50; i++) {
        while(this.relations.size > 0) {
            i++;
            rel = this.getBestRelation();

            if(i == this.argv.VI) {
                // console.log("next rel chosen", rel);
                var data = {
                    boxes: Array.from(this.boxesOk.values()).map(box => this.convertEntityForVizualizer(box)),
                    clusters: Array.from(this.clusters.values()).map(cluster => this.convertEntityForVizualizer(cluster)),
                    relations: Array.from(this.relations.keys()),
                    bestRel: {relationId: rel.id, entityAId: rel.entityA.id, entityBId: rel.entityB.id, similarity: rel.similarity},
                    width: this.pageDims.width,
                    height: this.pageDims.height
                };
        
                vizualizer.vizualize(data);
                break;
            }

            if(!rel) {
                console.log("No relations left!");
                console.log("Number of segments:", this.clusters.size);
                break;
            }

            this.relations.delete(rel.id);

            if(rel.similarity > clusteringThreshold) {
                console.log(`Similarity > ${clusteringThreshold}`, rel.similarity);
                console.log("Number of segments:", this.clusters.size);
                break;
            } 

            var cc = new Cluster(rel.entityA, rel.entityB);

            if(this.overlaps(cc, rel)) {
                continue;
            }

            this.removeEntities(cc); 
            this.updateRelations(cc);
            this.clusters.set(cc.id, cc);
        }

        
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

    removeEntities(cc) {

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

    updateRelations(cc) {

        var relsToUpdate = cc.addNeighboursAndRelations(this.clusters, this.boxes);

        for (const relToAdd of relsToUpdate.relAddSet) {
            this.relations.set(relToAdd.id, relToAdd);
        }

        for (const relToDel of relsToUpdate.relDelSet) {
            this.relations.delete(relToDel.id);
        }

        // for (const relToAdd of relUpdateLists.relAddList.values()) {
        //     this.relations.set(relToAdd.id, relToAdd);
        // }

        // for (const relToDelId of relUpdateLists.relDelList.keys()) {
        //     this.relations.delete(relToDelId);
        // }
    }

    convertEntityForVizualizer(entity) {
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

        // console.log(Array.from(entity.neighbours.entries()));

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

    vizualize() {

        var data = {
            boxes: Array.from(this.boxesOk.values()).map(box => this.convertEntityForVizualizer(box)),
            width: this.pageDims.width,
            height: this.pageDims.height
        };

        vizualizer.vizualize(data);
    }
}

function exportBoxesToJson(boxesMap, filepath) {
    
    const convertBox = (b) => {
        var box = {};
        box.left = b.left;
        box.top = b.top;
        box.right = b.right;
        box.bottom = b.bottom;
        box.width = b.width
        box.height = b.height;
        box.color = b.color;
        box.type = b.type;
        return box;
    }

    var boxesToExport = [];
    for (const box of boxesMap.values()) {
        boxesToExport.push(convertBox(box));
    }

    var boxesJson = JSON.stringify(boxesToExport);

    writeFileSync(filepath, boxesJson, (err) => {
        if (err) throw err;
    });

}

function exportClustersToJson(clustersMap, filepath) {
    
    const convertCluster = (c) => {
        var cluster = {};
        cluster.left = c.left;
        cluster.top = c.top;
        cluster.right = c.right;
        cluster.bottom = c.bottom;
        cluster.width = c.right - c.left;
        cluster.height = c.bottom - c.top;
        cluster.type = c.type;
        cluster.segm = 'basic';
        return cluster;
    }

    var clustersToExport = [];
    for (const cluster of clustersMap.values()) {
        clustersToExport.push(convertCluster(cluster));
    }

    var clustersJson = JSON.stringify(clustersToExport);

    writeFileSync(filepath, clustersJson, (err) => {
        if (err) throw err;
    });
}


function process(extracted, argv) {

    var cm = new ClusteringManager(extracted, argv);
    cm.removeContainers();

    exportBoxesToJson(cm.boxesOk, './output/boxes.json');

    cm.findAllRelations();
    cm.createClusters(argv.CT);

    exportClustersToJson(cm.clusters, './output/segments.json');


    console.log("allboxes", cm.allBoxesList.length);
    console.log("boxesOk", cm.boxesOk.size);
    console.log("boxesUnclustered", cm.boxes.size);

    
    // cm.vizualize();
}
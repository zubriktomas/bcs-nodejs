/**
 * Project: Box Clustering Segmentation in Node.js
 * Author: Tomas Zubrik, xzubri00@stud.fit.vutbr.cz
 * Year: 2021
 * License:  GNU GPLv3
 * Description: Main clustering process (segmentation logic) of method BCS 
 */

// const { writeFileSync } = require('fs');
const vizualizer = require('./box-vizualizer');
const Box = require('../structures/Box');
const Cluster = require('../structures/Cluster');
const RTree = require('../structures/RTree');
const { Selector, SelectorDirection } = require('../structures/Selector');
const { EntityType, isBox, isCluster } = require('../structures/EntityType');
const { exportFiles } = require('./exporter');
const { writeFileSync } = require('fs');


module.exports.process = process;

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

        this.clusteringThreshold = argv.CT;
        this.densityThreshold = 0;
        this.allBoxesList = extracted.boxesList; // all extracted boxes, must be processed for containers detection and deletion

        /* Dynamically changed throughout the segmentation process */
        this.boxes = this.reinitBoxes(extracted.boxesList); // in the beginning all unclustered boxes, change while clustering 
        this.boxesAll = null; // all boxes all the time, for vizualization purposes
        this.tree = this.createRTree(Array.from(this.boxes.values()));
        this.clusters = new Map();
        this.relations = new Map();
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

        this.boxesAll = new Map(this.boxes.entries());
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
        // this.densityThreshold = allBoxesContents/pageContents;
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

    createClusters() {
        var rel, iteration=0;

        while(this.relations.size > 0) {
            rel = this.getBestRelation();

            if(++iteration == this.argv.VI) {
                vizualizer.vizualize(this.getDataForVizualization());
                break;
            }

            this.relations.delete(rel.id);

            if(rel.similarity > this.clusteringThreshold) {
                if(this.argv.showInfo){
                    console.info(`Info: Similarity > ${this.clusteringThreshold}`, rel.similarity);
                    console.info("Info: Number of segments:", this.clusters.size);
                }
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

        /* Get all unclustered boxes except those that are being part of candidate cluster */
        var ob = overlapping.filter(entity => isBox(entity) && !(cc.boxes.has(entity.id)) && this.boxes.has(entity.id));

        /* Get all clusters that candidate cluster contains visually */
        var oc = overlapping.filter(entity => isCluster(entity));
        var clustersContainedVisually = oc.filter(cluster => cc.containsVisually(cluster));
        // var oc = overlapping.filter(entity => isCluster(entity));

        if(oc.length != clustersContainedVisually.length) {
            return true;
        }

        // console.log("oc.length", oc.length);

        var ommitClusters = new Map();

        for (const oBox of ob) {
            cc.addBoxes(oBox);
        }

        for (const oCluster of oc) {
            cc.addBoxes(oCluster);
            ommitClusters.set(oCluster.id, oCluster);
        }

        // for (let i = 0; i < ob.length; i++) {
        //     cc.addBoxes(ob[i]);
        // }

        // for (let i = 0; i < oc.length; i++) {
        //     cc.addBoxes(oc[i]);
        //     ommitClusters.set(oc[i].id, oc[i]);
        // }

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

    removeEntities(clusterCandidate) {

        for (const ccBox of clusterCandidate.boxes.values()) {
            this.boxes.delete(ccBox.id);

            /* If box has already been in cluster */
            if(ccBox.cluster) {
                
                /* Delete cluster from map */
                this.clusters.delete(ccBox.cluster.id);
                
                /* Delete all relations connected with cluster's neighbours */
                for (const cRel of ccBox.cluster.neighbours.values()) {
                    this.relations.delete(cRel.id);
                }

                /* Delete cluster from RTree */
                this.tree.remove(ccBox.cluster);
            }
        }

        /* Insert new cluster into RTree */
        this.tree.insert(clusterCandidate);
    }

    updateRelations(clusterCandidate) {

        /* Update neighbours and relations of all boxes and clusters from cluster candidate context */
        var relsToUpdate = clusterCandidate.updateAllNeighbours(this.clusters, this.boxes);

        /* Add all relations from add set */
        for (const relToAdd of relsToUpdate.relAddSet) {
            this.relations.set(relToAdd.id, relToAdd);
        }

        /* Delete all relations from delete set */
        for (const relToDel of relsToUpdate.relDelSet) {
            this.relations.delete(relToDel.id);
        }
    }

    // convertEntityForVizualizer(entity) {
    //     var vizEntity = {};
    //     vizEntity.left = entity.left;
    //     vizEntity.top = entity.top;
    //     vizEntity.right = entity.right;
    //     vizEntity.bottom = entity.bottom;
    //     /* If width, height and color are null - entity is cluster */
    //     vizEntity.width = entity.width || entity.right - entity.left;
    //     vizEntity.height = entity.height || entity.bottom - entity.top;
    //     vizEntity.color = entity.color || "#29e";
    //     vizEntity.oldColor = entity.color || "#29e";
    //     vizEntity.id = entity.id;
    //     vizEntity.type = entity.type;
    //     vizEntity.neighboursIds = Array.from(entity.neighbours.keys()).map(n => n.id);

    //     // console.log(Array.from(entity.neighbours.entries()));

    //     var neighboursIdsAndRelationsIds = [];
    //     for (const [neighbour, relation] of entity.neighbours.entries()) {
    //         neighboursIdsAndRelationsIds.push({neighbourId:neighbour.id, relationId: relation.id, similarity: relation.similarity});
    //     }
    //     vizEntity.neighboursIdsAndRelationsIds = neighboursIdsAndRelationsIds;


    //     if(entity.type == EntityType.cluster) {
    //         vizEntity.boxesIds = Array.from(entity.boxes.keys());
    //     }

    //     return vizEntity;
    // };

    getDataForVizualization(rel) {
        var data = {
            boxes: Array.from(this.boxesAll.values()).map(box => vizualizer.convertEntityForVizualizer(box)),
            clusters: Array.from(this.clusters.values()).map(cluster => vizualizer.convertEntityForVizualizer(cluster)),
            relations: Array.from(this.relations.keys()),
            bestRel: (!rel) ? null : {relationId: rel.id, entityAId: rel.entityA.id, entityBId: rel.entityB.id, similarity: rel.similarity},
            width: this.pageDims.width,
            height: this.pageDims.height
        };
        return data;
    }

    getDataForExport() {
        var data = {
            boxesMap: this.boxesAll,
            clustersMap: this.clusters,
            pageDims: this.pageDims
        }
        return data;
    }    

    // vizualize() {

    //     var data = {
    //         boxes: Array.from(this.boxesAll.values()).map(box => vizualizer.convertEntityForVizualizer(box)),
    //         // clusters: Array.from(this.clusters.values()).map(cluster => vizualizer.convertEntityForVizualizer(cluster)),
    //         relations: Array.from(this.relations.keys()),
    //         // bestRel: {relationId: rel.id, entityAId: rel.entityA.id, entityBId: rel.entityB.id, similarity: rel.similarity},
    //         width: this.pageDims.width,
    //         height: this.pageDims.height
    //     };

    //     // var data = {
    //     //     boxes: Array.from(this.boxesAll.values()).map(box => vizualizer.convertEntityForVizualizer(box)),
    //     //     width: this.pageDims.width,
    //     //     height: this.pageDims.height
    //     // };

    //     vizualizer.vizualize(data);
    // }
}

// function exportBoxesToJson(boxesMap, filepath) {
    
//     const convertBox = (b) => {
//         var box = {};
//         box.left = b.left;
//         box.top = b.top;
//         box.right = b.right;
//         box.bottom = b.bottom;
//         box.width = b.width
//         box.height = b.height;
//         box.color = b.color;
//         box.type = b.type;
//         return box;
//     }

//     var boxesToExport = [];
//     for (const box of boxesMap.values()) {
//         boxesToExport.push(convertBox(box));
//     }

//     var boxesJson = JSON.stringify(boxesToExport);

//     writeFileSync(filepath, boxesJson, (err) => {
//         if (err) throw err;
//     });

// }

// function exportClustersToJson(clustersMap, filepath) {
    
//     const convertCluster = (c) => {
//         var cluster = {};
//         cluster.left = c.left;
//         cluster.top = c.top;
//         cluster.right = c.right;
//         cluster.bottom = c.bottom;
//         cluster.width = c.right - c.left;
//         cluster.height = c.bottom - c.top;
//         cluster.type = c.type;
//         cluster.segm = 'basic';
//         return cluster;
//     }

//     var clustersToExport = [];
//     for (const cluster of clustersMap.values()) {
//         clustersToExport.push(convertCluster(cluster));
//     }

//     var clustersJson = JSON.stringify(clustersToExport);

//     writeFileSync(filepath, clustersJson, (err) => {
//         if (err) throw err;
//     });
// }


function process(extracted, argv) {

    var cm = new ClusteringManager(extracted, argv);
    cm.removeContainers();

    // exportByOption(argv, ExportOption.boxesJSON, cm.boxesAll, './output/boxes.json');
    // exportByOption(argv, ExportOption.boxesPNG, cm.getDataForVizualization(), './output/boxes.png');

    cm.findAllRelations();

    // console.log(cm.relations.values());
    // console.log("RELS COUNT:", cm.relations.size);

    cm.createClusters();

    if(!argv.export.includes(0)) {
        exportFiles(argv, cm.getDataForExport());
    }

    // exportClustersToJson(cm.clusters, './output/segments.json');
    // exportBoxesToJson(cm.boxesOk, './output/boxes.json');

    
    // exportByOption(argv, ExportOption.clustersJSON, cm.clusters, './output/segments.json');

    // if(argv.showInfo) {
    //     console.info("Info: allboxes count", cm.allBoxesList.length);
    //     console.info("Info: valid boxesAll count", cm.boxesAll.size);
    //     console.info("Info: boxesUnclustered", cm.boxes.size);
    // }

    
    // cm.vizualize();
}
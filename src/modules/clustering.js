/**
 * Project: Box Clustering Segmentation in Node.js
 * Author: Tomas Zubrik, xzubri00@stud.fit.vutbr.cz
 * Year: 2021
 * License:  GNU GPLv3
 * Description: Main clustering process (segmentation logic) of method BCS 
 */

const { vizualizeStep, convertEntityForVizualizer} = require('./box-vizualizer');
const Box = require('../structures/Box');
const Cluster = require('../structures/Cluster');
const RTree = require('../structures/RTree');
const { Selector, SelectorDirection } = require('../structures/Selector');
const { EntityType, isBox, isCluster } = require('../structures/EntityType');
const { exportFiles } = require('./exporter');


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
        var rel, stepVizualized = false, iteration=0;

        while(this.relations.size > 0) {
            rel = this.getBestRelation();

            if(++iteration == this.argv.VS) {
                vizualizeStep(this.getDataForVizualization(rel), iteration);
                stepVizualized = true;
                break;
            }

            this.relations.delete(rel.id);

            if(rel.similarity > this.clusteringThreshold) {
                if(this.argv.showInfo){
                    console.info(`Info: [Segment] Similarity > ${this.clusteringThreshold}`, rel.similarity);
                    console.info("Info: [Segment] Number of segments:", this.clusters.size);
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

        if (!stepVizualized && this.argv.VS > 0) {
            vizualizeStep(this.getDataForVizualization(), ++iteration);
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
    //     var overlapping, ob, oc, clustersSkip = new Map();
    //     do {
    //         overlapping = cc.getOverlappingEntities(this.tree);
    //         ob = overlapping.filter(entity => isBox(entity) && !cc.boxes.has(entity.id) && this.boxes.has(entity.id));
    //         oc = overlapping.filter(entity => isCluster(entity) && !clustersSkip.has(entity.id) );
    //         for (let i = 0; i < ob.length; i++) {
    //             cc.addBoxes(ob[i]);
    //         }
    //         for (let i = 0; i < oc.length; i++) {
    //             cc.addBoxes(oc[i]);
    //             clustersSkip.set(oc[i].id, oc[i]);
    //         }
    //     } while (!this.densityOverThreshold(cc));
    // }

    overlaps(cc, rel) {

        var relClusters = new Set();
        if(isCluster(rel.entityA)) relClusters.add(rel.entityA.id);
        if(isCluster(rel.entityB)) relClusters.add(rel.entityB.id);

        /* Get all overlapping entities */
        var overlapping = cc.getOverlappingEntities(this.tree);

        /* Get all unclustered boxes except those that are part of candidate cluster */
        var ob = overlapping.filter(entity => isBox(entity) && !(cc.boxes.has(entity.id)) && this.boxes.has(entity.id));

        /* Get all clusters that candidate cluster overlaps with and are not part of current relation */
        // var oc = overlapping.filter(entity => isCluster(entity) && entity.id != rel.entityA.id && entity.id != rel.entityB.id);
        var oc = overlapping.filter(entity => isCluster(entity) && !relClusters.has(entity.id));

        /* Get all clusters that candidate cluster contains visually */
        var clustersContainedVisually = oc.filter(cluster => cc.containsVisually(cluster));

        /* If cluster candidate overlaps with some other cluster and does not contain it visually */
        if(oc.length != clustersContainedVisually.length) {
            if(this.argv.debug) console.info("Info [Debug]: CC discarded immediately overlaps other cluster!");
            return true;
        }

        /* Create map of clusters that will be ommited in last check for overlapping */
        // var clustersSkip = new Map();
        
        /* Add clusters to skip set if entity relation is cluster */
        // if(isCluster(rel.entityA)) clustersSkip.set(rel.entityA.id, rel.entityA);
        // if(isCluster(rel.entityB)) clustersSkip.set(rel.entityB.id, rel.entityB);

        for (const oBox of ob) {
            if(this.argv.debug) console.info("Info [Debug]: Overlapping box added to CC");
            cc.addBoxes(oBox);
        }

        /* Attention! This code is unreachable */
        // console.log(oc);
        // for (const oCluster of oc) {
        //     if(this.argv.debug) console.info("Info [Debug]: All boxes from overlapping cluster added to CC");
        //     cc.addBoxes(oCluster);
        //     clustersSkip.set(oCluster.id, oCluster);
        // }

        /* Try to add new possible overlaps with unclustered boxes if any */
        overlapping = cc.getOverlappingEntities(this.tree);
        var ob = overlapping.filter(entity => isBox(entity) && !(cc.boxes.has(entity.id)) && this.boxes.has(entity.id));
        for (const oBox of ob) {
            if(this.argv.debug) console.info("Info [Debug]: New overlapping boxes added to CC");
            cc.addBoxes(oBox);
        }

        /* Check overlaps after adding boxes in previous step */
        overlapping = cc.getOverlappingEntities(this.tree);
        // oc = overlapping.filter(entity => isCluster(entity) && !clustersSkip.has(entity.id));
        oc = overlapping.filter(entity => isCluster(entity) && !relClusters.has(entity.id));
        var ob = overlapping.filter(entity => isBox(entity) && !(cc.boxes.has(entity.id)) && this.boxes.has(entity.id));

        if(this.argv.debug) {
            if(oc.length > 0) console.log("Info [Debug]: CC discarded, overlaps cluster!");
            if(ob.length > 0) console.log("Info [Debug]: CC discarded, overlaps box!"); 
            if(oc.length == 0 && ob.length == 0) console.log("Info [Debug]: CC no overlaps! Merging!");
        }

        /* If there is any overlap, discard cluster candidate, otherwise recalculate neighbours and commit it as valid cluster */
        return ob.length || oc.length;
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

    getDataForVizualization(rel) {
        var data = {
            boxes: Array.from(this.boxesAll.values()).map(box => convertEntityForVizualizer(box)),
            clusters: Array.from(this.clusters.values()).map(cluster => convertEntityForVizualizer(cluster)),
            relations: Array.from(this.relations.keys()),
            bestRel: (!rel) ? null : {relationId: rel.id, entityAId: rel.entityA.id, entityBId: rel.entityB.id, similarity: rel.similarity},
            pageDims: this.pageDims,
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
}

function createSegmentation(extracted, argv) {

    var cm = new ClusteringManager(extracted, argv);
    cm.removeContainers();
    cm.findAllRelations();
    cm.createClusters();

    if(!argv.export.includes(0)) {
        exportFiles(argv, cm.getDataForExport());
    }
}

module.exports.createSegmentation = createSegmentation;
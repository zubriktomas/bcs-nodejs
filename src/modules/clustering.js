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
const { isBox, isCluster } = require('../structures/EntityType');
const { exportFiles } = require('./exporter');

const assert = (condition, message) => { 
    if(!condition) throw Error('Assert failed: ' + (message || ''))
};

const calcContents = (entity) => {return (entity.right - entity.left ) * (entity.bottom - entity.top);};

/**
 * Clustering Manager class that manages the whole segmentation/clustering process
 */
class ClusteringManager {

    /**
     * Create CM instance
     * @param {*} extracted extracted data - boxes and pageDims
     * @param {*} argv program arguments
     */
    constructor(extracted, argv) {

        /* Assign arguments from main entry point */
        this.argv = argv;

        /* Webpage dimension with defined full scrollWidth and full scrollHeight */
        this.pageDims = extracted.pageDims;

        /* Assign clustering threshold */
        this.clusteringThreshold = argv.CT;
        this.densityThreshold = argv.DT ? argv.DT : 0;
        
        /* All extracted boxes, further processed for detection & deletion of containers (boxes that visually contain other boxes) 
         * This map of boxes is dynamically changed throughout a segmentation process. */
        this.boxesUnclustered = this.reinitBoxes(extracted.boxesList); 
        
        /* Create RTree from list of unclustered boxes */
        this.tree = this.createRTree(this.boxesUnclustered);
        
        /* All valid boxes for vizualization purposes (not changed, static) */
        this.boxesValid = this.removeContainers(this.boxesUnclustered); // !! Attention: also remove containers from boxesUnclustered !!

        /* Init empty map of clusters and relations */
        this.clusters = new Map();
        this.relations = new Map();

        this.allSegmentationSteps = [];
    }

    reinitBoxes(boxesList) {
        var boxesMap = new Map();

        for (const box of boxesList) {
            var boxStruct = new Box(box);
            boxesMap.set(boxStruct.id, boxStruct);            
        }
        return boxesMap;
    }

    createRTree(boxesUnclusteredMap) {
        var boxesList = Array.from(boxesUnclusteredMap.values());
        const tree = new RTree();
        tree.load(boxesList);
        return tree;
    }

    removeContainers(boxesUnclustered) {
        var selector, overlapping;

        /* Remove bigger containers that contain more than 2 boxes (probably background images) - elements with absolute positions */
        for (let box of boxesUnclustered.values()) {
            selector = Selector.fromEntity(box);
            overlapping = this.tree.search(selector.narrowBy1Px());
            if(overlapping.length > 2) { 
                boxesUnclustered.delete(box.id);
                this.tree.remove(box);
            }
        }

        /* Remove smaller containers now */
        for (let box of boxesUnclustered.values()) {
            selector = Selector.fromEntity(box);
            overlapping = this.tree.search(selector.narrowBy1Px());
            if(overlapping.length > 1) { 
                boxesUnclustered.delete(box.id);
                this.tree.remove(box);
            }
        }

        return new Map(boxesUnclustered.entries());
    }

    /**
     * Find all relations between all extracted boxes 
     */
    findAllRelations() {

        /* Constants */
        const pageContents = this.pageDims.width * this.pageDims.height, GUESS = "guess";

        /* Variables for guessing thresholds */
        var similaritySum = 0, allBoxesContents = 0;

        /* For every box find its all neighbours in all directions (relations are unique! same relation calculated only once) */
        for (let box of this.boxesUnclustered.values()) {
            box.findDirectNeighbours(this, SelectorDirection.right);
            box.findDirectNeighbours(this, SelectorDirection.down);
            box.findDirectNeighbours(this, SelectorDirection.left);
            box.findDirectNeighbours(this, SelectorDirection.up);
            
            if(this.argv.DT == GUESS){
                allBoxesContents += calcContents(box);
            }
        }

        /* Calculate all relations similarity values */
        for (let relation of this.relations.values()) {
            relation.calcSimilarity();

            if(this.argv.CT == GUESS){
                similaritySum += relation.similarity;
            }
        }

        /* Try to guess best Cluster Threshold */
        if(this.argv.CT == GUESS) {
            var guessCT = parseFloat((similaritySum / this.relations.size).toFixed(3));
            this.clusteringThreshold = guessCT;
            console.info("Info: [Threshold] Clustering Threshold guess", guessCT);
        }

        /* Try to guess best Density Threshold */
        if(this.argv.DT == GUESS) {
            var guessDT = parseFloat((allBoxesContents / pageContents).toFixed(3));
            this.densityThreshold = guessDT;
            console.info("Info: [Threshold] Density Threshold guess", guessDT);
        }
    }

    /**
     * Get best relation from relations set
     * @returns relation with the smallest similarity value
     */
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

    /**
     * Create clusters from calculated relations 
     */
    createClusters() {

        /* Variables */
        var bestRel, stepVizualized = false, iteration = 0;

        /* Loop over all relations and always take the best relation (with the smallest similarity) */
        while(this.relations.size > 0) {
            iteration++;

            /* Find best relation */
            bestRel = this.getBestRelation();

            if(this.argv.export.includes(7) && this.argv.export.length == 1){
                this.allSegmentationSteps.push({iteration: iteration, data: this.getDataForVizualization(bestRel)} );
            }

            /* Vizualize step if defined by argument (VS) |  !Attention: stop segmentation process immediately! */
            if(iteration == this.argv.VS) {
                vizualizeStep(this.getDataForVizualization(bestRel), iteration);
                stepVizualized = true;
                break;
            }
            
            /* Delete current best relation from relations map */
            this.relations.delete(bestRel.id);

            /* Check relation similarity, if it has exceeded CT, stop segmentation */
            if(bestRel.similarity > this.clusteringThreshold) {
                if(this.argv.showInfo){
                    console.info(`Info: [Segment] Similarity > ${this.clusteringThreshold}`, bestRel.similarity);
                    console.info("Info: [Segment] Number of segments:", this.clusters.size);
                }
                break;
            } 

            /* Create new cluster candidate by relation entities */
            var clusterCandidate = new Cluster(bestRel.entityA, bestRel.entityB);

            /* If CC overlaps with some entity, continue with next best relation (current was already deleted) */
            if(this.clusterDensityUnderThreshold(clusterCandidate) || this.overlaps(clusterCandidate, bestRel)) {
                continue;
            }

            /* If CC passes overlaps test update all sets of entites, relations and RTree */
            this.removeEntities(clusterCandidate); 
            this.updateRelations(clusterCandidate);

            /* Commit candidate cluster as valid cluster */
            this.clusters.set(clusterCandidate.id, clusterCandidate);
        }

        /* If vizualization step was specified, but value of iteration exceeded number of processed relations, show absolute result */
        if (!stepVizualized && this.argv.VS > 0) {
            vizualizeStep(this.getDataForVizualization(), ++iteration);
        }

        if(this.argv.export.includes(7) && this.argv.export.length == 1){
            this.allSegmentationSteps.push({iteration: iteration, data: this.getDataForVizualization()} );
        }
    }

    clusterDensityUnderThreshold(cc) {

        var ccContents = calcContents(cc);

        var ccBoxesContents = 0;
        for (const cBox of cc.boxes.values()) {
            ccBoxesContents += calcContents(cBox);
        }

        return (ccBoxesContents/ccContents) < this.densityThreshold;
    }

    /**
     * Check if cluster candidate overlaps with some entity by unallowed/unwanted manner
     * @param {Cluster} cc 
     * @param {Relation} rel 
     * @returns true | false
     */
    overlaps(cc, rel) {

        /* Create set of clusters that constitute relations itself (if any entity of relation is cluster) */
        var clustersSkip = new Set();
        if(isCluster(rel.entityA)) clustersSkip.add(rel.entityA.id);
        if(isCluster(rel.entityB)) clustersSkip.add(rel.entityB.id);

        /* Get all overlapping entities */
        var overlapping = cc.getOverlappingEntities(this.tree);

        /* Get all unclustered boxes except those that are part of candidate cluster */
        var oBoxes = overlapping.filter(entity => isBox(entity) && !(cc.boxes.has(entity.id)) && this.boxesUnclustered.has(entity.id));

        /* Get all clusters that candidate cluster overlaps with and are not part of current relation */
        var oClusters = overlapping.filter(entity => isCluster(entity) && !clustersSkip.has(entity.id));

        /* Get all clusters that candidate cluster contains visually */
        var clustersContainedVisually = oClusters.filter(cluster => cc.containsVisually(cluster));

        /* If cluster candidate overlaps with some other cluster and does not contain it visually */
        if(oClusters.length != clustersContainedVisually.length) {
            if(this.argv.debug) console.info("Info [Debug]: CC discarded immediately overlaps other cluster!");
            return true;
        }

        /* If CC visually contains more clusters than one discard CC */
        if(clustersContainedVisually.length > 1) {
            if(this.argv.debug) console.info("Info [Debug]: CC discarded contains visually more than one cluster!");
            return true;
        }

        for (const oBox of oBoxes) {
            if(this.argv.debug) console.info("Info [Debug]: Overlapping box added to CC");
            cc.addBoxes(oBox);
        }

        /* Reachable only if some cluster is visually contained in CC, otherwise oClusters empty */
        for (const oCluster of oClusters) {
            if(this.argv.debug) console.info("Info [Debug]: All boxes from visually contained cluster added to CC");
            cc.addBoxes(oCluster);
            clustersSkip.add(oCluster.id);
        }

        /* Try to add new possible overlaps with unclustered boxes if any */
        overlapping = cc.getOverlappingEntities(this.tree);
        oBoxes = overlapping.filter(entity => isBox(entity) && !(cc.boxes.has(entity.id)) && this.boxesUnclustered.has(entity.id));
        for (const oBox of oBoxes) {
            if(this.argv.debug) console.info("Info [Debug]: New overlapping boxes added to CC");
            cc.addBoxes(oBox);
        }

        /* Check overlaps after adding boxes in previous step, if any discard CC (overlaps == true) */
        overlapping = cc.getOverlappingEntities(this.tree);
        oClusters = overlapping.filter(entity => isCluster(entity) && !clustersSkip.has(entity.id));
        oBoxes = overlapping.filter(entity => isBox(entity) && !(cc.boxes.has(entity.id)) && this.boxesUnclustered.has(entity.id));

        if(this.argv.debug) {
            if(oClusters.length > 0) console.log("Info [Debug]: CC discarded, overlaps cluster!");
            if(oBoxes.length > 0) console.log("Info [Debug]: CC discarded, overlaps box!"); 
            if(oClusters.length == 0 && oBoxes.length == 0) console.log("Info [Debug]: CC no overlaps! Merging!");
        }

        /* If there is any overlap, discard cluster candidate, otherwise recalculate neighbours and commit it as valid cluster */
        return oBoxes.length || oClusters.length || this.clusterDensityUnderThreshold(cc);
    }

    /**
     * Remove entites (boxes, clusters, relations) from sets AND/OR from RTree
     * @param {*} clusterCandidate 
     */
    removeEntities(clusterCandidate) {

        for (const ccBox of clusterCandidate.boxes.values()) {
            this.boxesUnclustered.delete(ccBox.id);

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

        /* Insert new cluster (CC) into RTree */
        this.tree.insert(clusterCandidate);
    }

    /**
     * Update all relations and neighbours altogether
     * @param {Cluster} clusterCandidate 
     */
    updateRelations(clusterCandidate) {

        /* Update neighbours and relations of all boxes and clusters from cluster candidate context */
        var relsToUpdate = clusterCandidate.updateAllNeighbours(this.clusters, this.boxesUnclustered);

        /* Add all relations from add set */
        for (const relToAdd of relsToUpdate.relAddSet) {
            this.relations.set(relToAdd.id, relToAdd);
        }

        /* Delete all relations from delete set */
        for (const relToDel of relsToUpdate.relDelSet) {
            this.relations.delete(relToDel.id);
        }
    }

    /**
     * Get data for vizualization (boxes and clusters list (special format!), relations list, pageDims, bestRel)
     * @param {Relation} rel if it is defined, it is vizualized 
     * @returns data
     */
    getDataForVizualization(rel) {
        var data = {
            boxes: Array.from(this.boxesValid.values()).map(box => convertEntityForVizualizer(box)),
            clusters: Array.from(this.clusters.values()).map(cluster => convertEntityForVizualizer(cluster)),
            relations: Array.from(this.relations.keys()),
            bestRel: (!rel) ? null : {relationId: rel.id, entityAId: rel.entityA.id, entityBId: rel.entityB.id, similarity: rel.similarity},
            pageDims: this.pageDims,
        };
        return data;
    }

    /**
     * Get data for export (boxes, clusters, pageDims)
     * @returns data
     */
    getDataForExport() {
        var data = {
            boxesMap: this.boxesValid,
            clustersMap: this.clusters,
            pageDims: this.pageDims
        }
        return data;
    }    
}

/**
 * Function exported for access to main (bcs.js)
 * @param {*} extracted extracted data
 * @param {*} argv program arguments
 */
function createSegmentation(extracted, argv) {

    var cm = new ClusteringManager(extracted, argv);
    cm.findAllRelations();
    cm.createClusters();

    if(!argv.export.includes(0)) {
        
        var dataForExport = cm.getDataForExport();

        if(argv.export.includes(7) && argv.export.length == 1) {
            dataForExport.allSegmentationSteps = cm.allSegmentationSteps;
        } 
        exportFiles(argv, dataForExport);
    }
}

module.exports.createSegmentation = createSegmentation;
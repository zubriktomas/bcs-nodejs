 /**
 * Project: Box Clustering Segmentation in Node.js
 * Author: Tomas Zubrik, xzubri00@stud.fit.vutbr.cz
 * Year: 2021
 * License:  GNU GPLv3
 * Description: Functions useful for process of node extraction.
 */

const {EntityType, isCluster, isBox} = require('../structures/EntityType');
const Relation = require('./Relation');
const {Selector} = require('./Selector');

/**
 * Cluster Structure that represents webpage segment
 */
class Cluster {

    /**
     * Create cluster from two entities (clusters, boxes)
     * @param {(Cluster|Box)} entityA 
     * @param {(Cluster|Box)} entityB 
     */
    constructor(entityA, entityB) {

        /* Basic info */
        this.left = null;
        this.top = null;
        this.right = null;
        this.bottom = null;
        this.id = null;
        this.type = EntityType.cluster;

        /* Advanced info used in clustering */
        this.neighbours = new Map(); // entity => relation
        this.maxNeighbourDistance = 0;
        this.boxes = new Map(); // BoxId => Box

        /* Add boxes, recalc coordinates and update cluster ID */
        this.addBoxes(entityA);
        this.addBoxes(entityB);
    }

    /**
     * Update cluster id by its current coordinates
     */
    updateId() {
        this.id = `(t:${this.top},l:${this.left},b:${this.bottom},r:${this.right})`;
    }

    /**
     * Recalculate cluster coordinates given by its boxes' coordinates  
     */
    recalcCoordinates() {
        var left, top, bottom, right;

        left = Number.MAX_SAFE_INTEGER;
        top = Number.MAX_SAFE_INTEGER;
        right = Number.MIN_SAFE_INTEGER;
        bottom = Number.MIN_SAFE_INTEGER;

        /* Get edge values from all boxes in cluster */
        for (const box of this.boxes.values()) {
            left = Math.min(left, box.left);
            top = Math.min(top, box.top);
            bottom = Math.max(bottom, box.bottom);
            right = Math.max(right, box.right);
        }

        /* Update cluster coordinates */
        this.left = left;
        this.top = top;
        this.bottom = bottom;
        this.right = right;
    }

    /**
     * Add boxes to cluster from entity (box itself OR all boxes from other cluster)
     * @param {*} entity 
     */
    addBoxes(entity) {

        if(isCluster(entity)) {
            for (const box of entity.boxes.values()) {
                this.boxes.set(box.id, box);
            }
        } else {
            this.boxes.set(entity.id, entity);
        }
        
        this.recalcCoordinates();
        this.updateId();
    }

    /**
     * Add cluster neighbour with calculated relation and similarity
     * @param {(Cluster|Box)} entity 
     * @returns Relation OR null (if entity is already a cluster's neighbour)
     */
    addNeighbour(entity) {
        if(!this.neighbours.has(entity)) {
            var rel = new Relation(this, entity);
            rel.calcSimilarity();
            this.neighbours.set(entity, rel);
            return rel;
        } else {
            return null;
        }
    }

    /**
     * Delete cluster neighbour 
     * @param {(Cluster|Box)} entity 
     * @returns Relation connected with neighbour OR null (if entity is not cluster's neighbour)
     */
    deleteNeighbour(entity) {
        if(this.neighbours.has(entity)) {
            var rel = this.neighbours.get(entity);
            this.neighbours.delete(entity);
            return rel;
        } else {
            return null;
        }
    }

    /**
     * Update cluster neighbours and relations
     * @returns Relation delete list to update other entities from ClusteringManager context
     */
    addNeighboursAndRelations(clustersCommited, boxesUnclustered) {

        /* Initialize relation delete list */
        // var relDelList = new Map();
        // var relAddList = new Map();
        var relAddSet = new Set();
        var relDelSet = new Set();
    
        /* Loop over all cluster's boxes */
        for (const ccBox of this.boxes.values()) {

            /* Loop over all existing clusters to find out if any box from candidate cluster is direct neighbour of some cluster */
            for (const cluster of clustersCommited.values()) {

                // var relToDel = cluster.deleteNeighbour(ccBox.cluster);
                // if(relToDel) {
                //     cluster.addNeighbour(this);
                //     relDelList.set(relToDel.id, relToDel);
                // }

                // relToDel = cluster.deleteNeighbour(ccBox);
                // if(relToDel) {
                //     cluster.addNeighbour(this);
                //     if(relTodel.id != "(t:568.28125,l:203,b:611.28125,r:761.671875)(t:861.265625,l:373.5,b:872.265625,r:847.296875)")
                //     relDelList.set(relToDel.id, relToDel);
                // }


                var relToDel = ccBox.cluster ? cluster.deleteNeighbour(ccBox.cluster) : cluster.deleteNeighbour(ccBox);
                if(relToDel) {
                    var relToAdd = cluster.addNeighbour(this);
                    // if(relToDel.id != "(t:568.28125,l:203,b:611.28125,r:761.671875)(t:861.265625,l:373.5,b:872.265625,r:847.296875)")
                    if(relToAdd) { /*relAddList.set(relToAdd.id, relToAdd);*/ relAddSet.add(relToAdd);}
                    // relDelList.set(relToDel.id, relToDel);
                    relDelSet.add(relToDel);
                } 
            }

            for (const uBox of boxesUnclustered.values()) {
                var relToDel = uBox.neighbours.get(ccBox);
                if(relToDel) {
                    // relDelList.set(relToDel.id, relToDel);
                    relDelSet.add(relToDel)
                }
            }

            /* Loop over all box's neighbours */
            for (const [bNeighbour, bRel] of ccBox.neighbours.entries()) {

                /* Extended */
                // this.maxNeighbourDistance = Math.max(this.maxNeighbourDistance, bRel.absoluteDistance);

                // relDelList.set(bRel.id, bRel);
                relDelSet.add(bRel);

                /* Skip If boxes inside candidate cluster ak su si navzajom priamymi susedmi, boxy vo vytvaranom zhluku */
                // if(this.boxes.has(bNeighbour.id)) {

                //     // relDelList.set(bRel.id, bRel);
                //     continue;
                // }

                /* ak je box v clustri, pridaj ako suseda cluster, inak pridaj samotny box */
                if(!this.boxes.has(bNeighbour.id)) {
                    var relToAdd = this.addNeighbour(bNeighbour.cluster ? bNeighbour.cluster : bNeighbour);
                    if(relToAdd) {/*relAddList.set(relToAdd.id, relToAdd);*/ relAddSet.add(relToAdd); }
                }
            }
            ccBox.cluster = this;
        }

        // console.log("del",relDelList.size, relDelSet.size);
        // console.log("add", relAddList.size, relAddSet.size);

        // if(relAddList.size != relAddSet.length) {

            // for (const [id1,rel1] of relAddList.entries()) {
            //     for (const rel2 of relAddSet.values()) {
            //         if(id1 == rel2.id) {
            //             // console.log("R1", rel1.similarity);
            //             // console.log("R2", rel2.similarity);
            //         }
            //     }
            // }

            // console.log(relAddList);
            // console.log(relAddSet);
        // }

        return {/*relDelList: relDelList, relAddList: relAddList,*/ relDelSet: relDelSet, relAddSet: relAddSet};
    }

    /**
     * Find all entities that overlap cluster (this)
     * @param {RTree} tree 
     * @returns List of overlapping entities
     */
    getOverlappingEntities(tree) {

        /* Search entities in Rtree on coordinates specified by cluster itself */
        var overlappingEntities = tree.search(Selector.fromEntity(this).narrowBy1Px());
        return overlappingEntities;
    }

    /**
     * Check if cluster overlaps any other cluster
     * @param {[]} overlapping List of overlapping entities
     * @param {*} rel 
     * @returns true|false
     */
    overlapsAnyCluster(overlapping, rel) {
   
        /* Cluster Candidate is not in the tree yet, it is not needed to check its ID */
        // var overlappingCluster = overlapping.find(entity => isCluster(entity) && entity.id != rel.entityA.id && entity.id != rel.entityB.id);
        var overlappingCluster = overlapping.filter(entity => isCluster(entity)); 
    
        /* If it is not undefined, then return true */
        return overlappingCluster.length ? true : false;
    }

    /**
     *  Check if cluster overlaps any other box, that is not contained in cluster yet
     * @param {*} overlapping 
     * @param {*} rel 
     * @returns true|false
     */
    overlapsAnyBox(overlapping, rel) {
    
        /* Find all overlapping boxes, except those which constitute the cluster itself */
        var overlappingBoxes = overlapping.filter(entity => isBox(entity) && !(this.boxes.has(entity.id)) && entity.id != rel.entityA.id && entity.id != rel.entityB.id);

        /* If it is not empty, then return true */
        return overlappingBoxes.length ? true : false;
    }

    /**
     * Check if cluster contains entity visually
     * @param {(Cluster|Box)} entity 
     * @returns true|false
     */
    containsVisually(entity) {

        /* Check if top left corner is inside cluster */
        var topLeftInside = this.top <= entity.top && this.left <= entity.left;

        /* Check if bottom right corner is inside cluster */
        var bottomRightInside = this.bottom >= entity.bottom && this.right >= entity.right;

        return topLeftInside && bottomRightInside;
    }
}

module.exports = Cluster;
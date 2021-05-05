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
    constructor(entityA, entityB, argv) {
        
        /*  */
        this.argv = argv;

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

                if(this.argv.extended){
                    for (const bRel of box.neighbours.values()) {
                        this.maxNeighbourDistance = Math.max(this.maxNeighbourDistance, bRel.absoluteDistance);
                    }
                }

            }
        } else {
            this.boxes.set(entity.id, entity);

            if(!this.argv.extended) {
                for (const bRel of entity.neighbours.values()) {
                    this.maxNeighbourDistance = Math.max(this.maxNeighbourDistance, bRel.absoluteDistance);
                }
            }
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
            var rel = new Relation(this, entity, null, this.argv.extended);
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
     updateAllNeighbours(clustersCommited, boxesUnclustered) {

        /* Initialize sets of relations to add and to delete, and variables */
        var relAddSet = new Set(), relToAdd;
        var relDelSet = new Set(), relToDel;
    
        /* Loop over all candidate cluster's boxes */
        for (const ccBox of this.boxes.values()) {

            /* Loop over all commited (existing) clusters to find out if any box (or its cluster, if exists) from 
             * candidate cluster is direct neighbour of some commited cluster */
            for (const commCluster of clustersCommited.values()) {

                /* If box has already been in cluster, delete that cluster from commCluster neighbours, else delete box */
                relToDel = ccBox.cluster ? commCluster.deleteNeighbour(ccBox.cluster) : commCluster.deleteNeighbour(ccBox);

                /* Check if some neighbour was deleted */
                if(relToDel) {
                    
                    /* Add deleted relation to relation delete set */
                    relDelSet.add(relToDel);

                    /* If some neighbour was delete, we have to add candidate cluster (this) as neighbour of commited cluster */
                    relToAdd = commCluster.addNeighbour(this);
                    
                    /* Check if candidate cluster was actually added as neighbour */
                    if(relToAdd) { 

                        /* If so, add it to relation add set */
                        relAddSet.add(relToAdd);
                    }
                } 
            }

            /* Loop over all unclustered boxes to find out if cluster candidate box is its direct neighbour */
            for (const uBox of boxesUnclustered.values()) {
            
                /* Just get relation */
                var relToDel = uBox.neighbours.get(ccBox);
                if(relToDel) {
                    /* Add relation to delete set */
                    relDelSet.add(relToDel)
                }
            }

            /* Loop over all box's neighbours */
            for (const [bNeighbour, bRel] of ccBox.neighbours.entries()) {

                if(this.argv.extended) {
                    this.maxNeighbourDistance = Math.max(this.maxNeighbourDistance, bRel.absoluteDistance);
                }

                /* Delete every relation between candidate cluster box and its all neighbours */
                relDelSet.add(bRel);

                /* Skip all relations between boxes inside cluster candidate, they are no longer needed (added into delete set by command above) */
                if(!this.boxes.has(bNeighbour.id)) {
                    /* If neighbour of box is already in some cluster, add that cluster as neighbour, if not add box */
                    var relToAdd = this.addNeighbour(bNeighbour.cluster ? bNeighbour.cluster : bNeighbour);
                    if(relToAdd) { 
                        relAddSet.add(relToAdd); 
                    }
                }
            }

            /* After all recalculations concerning currently processed box, assign new cluster to it */
            ccBox.cluster = this;
        }

        /* Return relation add and delete set in object */
        return {relDelSet: relDelSet, relAddSet: relAddSet};
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
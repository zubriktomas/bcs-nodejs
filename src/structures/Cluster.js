 /**
 * Project: Box Clustering Segmentation in Node.js
 * Author: Tomas Zubrik, xzubri00@stud.fit.vutbr.cz
 * Year: 2021
 * License:  GNU GPLv3
 * Description: Functions useful for process of node extraction.
 */

const {EntityType, isCluster, isBox} = require('../structures/EntityType');
const Relation = require('./Relation');

class Cluster {
    constructor(entityA, entityB) {
        this.left = Number.MAX_SAFE_INTEGER;
        this.top = Number.MAX_SAFE_INTEGER;
        this.right = Number.MIN_SAFE_INTEGER;
        this.bottom = Number.MIN_SAFE_INTEGER;

        this.id = this.generateId(entityA, entityB);
        this.type = EntityType.cluster;

        this.maxNeighbourDistance = 0;
        this.neighbours = new Map();
        
        this.boxes = new Map();
    }

    generateId(entityA, entityB) {

        this.recalcCoordinates(entityA);
        this.recalcCoordinates(entityB);

        return `(t: ${this.top}, l:${this.left}, b:${this.bottom}, r:${this.right})`;
    }

    recalcCoordinates(entity) {
        var left, top, bottom, right;

        if(isBox(entity)) {
            left = Math.min(this.left, entity.left);
            top = Math.min(this.top, entity.top);
            bottom = Math.max(this.bottom, entity.bottom);
            right = Math.max(this.right, entity.right);
        } else {
            for (const box of entity.boxes.values()) {
                left = Math.min(this.left, box.left);
                top = Math.min(this.top, box.top);
                bottom = Math.max(this.bottom, box.bottom);
                right = Math.max(this.right, box.right);
            }
        }

        this.left = left;
        this.top = top;
        this.bottom = bottom;
        this.right = right;
    }

    addBoxes(entity) {

        if(isCluster(entity)) {
            for (const box of entity.boxes.values()) {
                this.boxes.set(box.id, box);
            }
        } else {
            entity.isInCluster = true;
            this.boxes.set(entity.id, entity);
        }
    }

    getBoxes() {
        return this.boxes;

    }

    addNeighboursAndRelations() {

        for (const box of this.boxes.values()) {
            for (const bNeighbour of box.neighbours.keys()) {
                /* Create new relation between cluster and entity, if entity(box) is not in the cluster and */
                if(!this.boxes.has(bNeighbour.id) && !this.neighbours.has(bNeighbour.id) && !bNeighbour.isInCluster) {
                    var rel = new Relation(this, bNeighbour);
                    // console.log(rel.id, rel.absoluteDistance);
                    rel.calcSimilarity();
                    this.neighbours.set(bNeighbour, rel);
                } 
            }
        }
    }

    getOverlappingEntities(tree) {

        /* Search entities in Rtree on coordinates specified by cluster itself */
        var overlappingEntities = tree.search(this);

        return overlappingEntities;
    }

    overlapsAnyCluster(overlapping) {
   
        /* Cluster Candidate is not in the tree yet, it is not needed to check its ID */
        var overlappingCluster = overlapping.find(entity => isCluster(entity));
    
        /* If it is not undefined, then return true */
        return overlappingCluster ? true : false;
    }

    overlapsAnyBox(overlapping) {
    
        /* Find all overlapping boxes, except those which constitute the cluster itself */
        var overlappingBoxes = overlapping.filter(entity => isBox(entity) && !(this.boxes.has(entity.id)));
    
        /* If it is not empty, then return true */
        return overlappingBoxes.length ? true : false;
    }

    toString() {
        var clusterString = `\n Cluster: ${this.id} \n |Neighbours|: ${this.neighbours.size}\n`;
        for (const n of this.neighbours.keys()) {
            clusterString += (n.id+"\n");
        }
        return clusterString;
    }

}


module.exports = Cluster;

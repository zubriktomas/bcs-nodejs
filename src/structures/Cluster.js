 /**
 * Project: Box Clustering Segmentation in Node.js
 * Author: Tomas Zubrik, xzubri00@stud.fit.vutbr.cz
 * Year: 2021
 * License:  GNU GPLv3
 * Description: Functions useful for process of node extraction.
 */

class Cluster {
    constructor(entityA, entityB) {
        this.left = Math.min(entityA.left, entityB.left);
        this.top = Math.min(entityA.top, entityB.top);
        this.right = Math.max(entityA.right, entityB.right);
        this.bottom = Math.max(entityA.bottom, entityB.bottom);
        this.id = `(t: ${this.top}, l:${this.left}, b:${this.bottom}, r:${this.right})`;
        this.type = 'cluster';

        this.maxNeighbourDistance = 0;
        this.neighbours = new Map();
        
        this.boxes = new Map();

        this.overlappingEntities = null;
    }

    assignBoxes(entityA, entityB) {
        this.boxes.set(entityA.id, entityA);
        this.boxes.set(entityB.id, entityB);
    }

    getOverlappingEntities(tree) {

        /* Search entities in Rtree on coordinates specified by cluster itself */
        var overlappingEntities = tree.search(this);

        this.overlappingEntities = overlappingEntities;
    }

    overlapsAnyCluster() {
   
        /* Cluster Candidate is not in the tree yet, it is not needed to check its ID */
        var overlappingCluster = this.overlappingEntities.find(entity => entity.type == EntityType.cluster);
    
        /* If it is not undefined, then return true */
        return overlappingCluster ? true : false;
    }

    overlapsAnyBox() {
    
        /* Find all overlapping boxes, except those which constitute the cluster itself */
        var overlappingBoxes = this.overlappingEntities.filter(entity => entity.type == EntityType.box && !(this.boxes.hasOwnProperty(entity.id)));
    
        /* If it is not empty, then return true */
        return overlappingBoxes.length ? true : false;
    }

    // commit() {

    //     /* Add cluster to map of clusters */
    //     globals.clusters[this.id] = this;

    //     /* IMPORTANT !!! Delete all boxes constituting new cluster from tree */
    //     /* Recalculate all relations */
    //     /* Recalculate all neighbours */
    // }

    // removeBoxesFromUnclusteredSet() {
    //     var clusterBoxes = Object.values(this.boxes);

    //     /* Remove boxes from set of unclustered boxes */
    //     clusterBoxes.forEach(box => {
    //         delete globals.unclusteredBoxes[box.id];
    //         globals.tree.remove(box);
    //     });
    // }


    // recalculateNeighbours() {

    //     var clusterBoxes = Object.values(this.boxes);

    //     clusterBoxes.forEach(box => {
    //         box.neighboursIds.forEach(boxNeighbourId => {
    //             if(globals.unclusteredBoxes.hasOwnProperty(boxNeighbourId) && !this.neighbours.hasOwnProperty(boxNeighbourId)){
    //                 this.neighbours[boxNeighbourId] = globals.unclusteredBoxes[boxNeighbourId];
    //             } else {
    //                 /* druha cast pocmienky pre Cluster Direct Neighbourhood */
    //             }
    //         });
    //     });
    // }
}

module.exports = Cluster;

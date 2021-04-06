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

class Cluster {
    constructor(entityA, entityB) {
        this.left = null;
        this.top = null;
        this.right = null;
        this.bottom = null;
        this.id = null;

        this.type = EntityType.cluster;

        this.neighbours = new Map(); // entity => relation

        this.boxes = new Map(); // boxId => box
        this.addBoxes(entityA);
        this.addBoxes(entityB);

        // this.recalcCoordinates();
        // this.id = this.generateId();
    }

    generateId() {
        this.id = `(t: ${this.top}, l:${this.left}, b:${this.bottom}, r:${this.right})`;
    }

    recalcCoordinates() {
        var left, top, bottom, right;

        left = Number.MAX_SAFE_INTEGER;
        top = Number.MAX_SAFE_INTEGER;
        right = Number.MIN_SAFE_INTEGER;
        bottom = Number.MIN_SAFE_INTEGER;

        for (const box of this.boxes.values()) {
            left = Math.min(left, box.left);
            top = Math.min(top, box.top);
            bottom = Math.max(bottom, box.bottom);
            right = Math.max(right, box.right);
        }


        // if(isBox(entity)) {
            // left = Math.min(this.left, entity.left);
            // top = Math.min(this.top, entity.top);
            // bottom = Math.max(this.bottom, entity.bottom);
            // right = Math.max(this.right, entity.right);
        // } else {
        //     for (const box of entity.boxes.values()) {
        //         left = Math.min(this.left, box.left);
        //         top = Math.min(this.top, box.top);
        //         bottom = Math.max(this.bottom, box.bottom);
        //         right = Math.max(this.right, box.right);
        //     }
        // }

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
            this.boxes.set(entity.id, entity);
        }

        this.recalcCoordinates();
        this.generateId();
    }

    addNeighbour(entity) {
        /* vynecha duplikovanych susedov: A by bolo 2-krat, ale nebude */
        if(!this.neighbours.has(entity)) {
            var rel = new Relation(this, entity);
            rel.calcSimilarity();
            this.neighbours.set(entity, rel);
            return rel;
        } else {
            return null;
        }
    }

    deleteNeighbour(entity) {
        if(this.neighbours.has(entity)) {
            var rel = this.neighbours.get(entity);
            this.neighbours.delete(entity);
            return rel;
        } else {
            return null;
        }
    }

    hasBox(box) {
        return this.boxes.has(box.id);
    }

    addNeighboursAndRelations() {

        var relDelList = new Map();

        /* cez vsetky boxy v clustri: C, D */
        for (const box of this.boxes.values()) {

            /* cez vsetykch susedov boxov C: A,D   a D: A,C,E*/
            for (const [bNeighbour, bRel] of box.neighbours.entries()) {

                if(bNeighbour.cluster) {
                    var res = bNeighbour.cluster.deleteNeighbour(box);
                    
                    if(box.cluster)
                        var res2 = bNeighbour.cluster.deleteNeighbour(box.cluster);

                    if(res) {
                        console.log(`From cluster ${mapper(bNeighbour.cluster.id)} neighbour ${mapper(box.id)} deleted!`);
                        relDelList.set(res.id, res);
                    }

                    if(res2) {
                        console.log(`From cluster ${mapper(bNeighbour.cluster.id)} neighbour ${mapper(box.cluster.id)} deleted!`);
                        relDelList.set(res2.id, res2);
                    }

                } else {
                    relDelList.set(bRel.id, bRel);
                }

                /* vynecha z C: D, z D: C */
                if(this.hasBox(bNeighbour)) {

                    // var rrr = bNeighbour.neighbours.get(box);
                    // relDelList.set(rrr.id, rrr);
                    continue;
                }

                /* ak je box v clustri, pridaj ako suseda cluster, inak pridaj samotny box */
                var res = this.addNeighbour(bNeighbour.cluster ? bNeighbour.cluster : bNeighbour);
                if(res) console.log(`entity ${mapper((bNeighbour.cluster ? bNeighbour.cluster : bNeighbour).id)} added as ${mapper(this.id)} neighbour`);

                /* Create new relation between cluster and entity, if entity(box) is not in the cluster and */
                // if(!this.boxes.has(bNeighbour.id) && !this.neighbours.has(bNeighbour) && bNeighbour.cluster){
                //     console.log("bNeighbour added as CC neighbour",mapper(bNeighbour.id));
                //     this.addNeighbour(bNeighbour);
                // } 

                /** TOTO BY TU NEMALO BYT!! */
                // if(isCluster(bNeighbour)) {
                //     for (const x of bNeighbour.neighbours.keys()) {
                //         if(x.cluster) {
                //             bNeighbour.neighbours.delete(x);
                //         }                        
                //     }
                // }
            }

            box.cluster = this;
        }
        return relDelList;
        // console.log("cluster Ncount", this.neighbours.size);
    }

    getOverlappingEntities(tree) {

        /* Search entities in Rtree on coordinates specified by cluster itself */
        var overlappingEntities = tree.search(Selector.fromEntity(this).narrowBy1Px());
        return overlappingEntities;
    }

    overlapsAnyCluster(overlapping, rel) {
   
        /* Cluster Candidate is not in the tree yet, it is not needed to check its ID */
        // var overlappingCluster = overlapping.find(entity => isCluster(entity) && entity.id != rel.entityA.id && entity.id != rel.entityB.id);
        var overlappingCluster = overlapping.filter(entity => isCluster(entity)); 
    
        /* If it is not undefined, then return true */
        return overlappingCluster.length ? true : false;
    }

    overlapsAnyBox(overlapping, rel) {
    
        /* Find all overlapping boxes, except those which constitute the cluster itself */
        var overlappingBoxes = overlapping.filter(entity => isBox(entity) && !(this.boxes.has(entity.id)) && entity.id != rel.entityA.id && entity.id != rel.entityB.id);

        /* If it is not empty, then return true */
        return overlappingBoxes.length ? true : false;
    }

    containsVisually(entity) {
        var topLeftInside, bottomRightInside;

        topLeftInside = this.top <= entity.top && this.left <= entity.left;
        bottomRightInside = this.bottom >= entity.bottom && this.right >= entity.right;

        return topLeftInside && bottomRightInside;
    }

    toString() {
        var clusterString = `\n Cluster: ${this.id} \n |Neighbours|: ${this.neighbours.size}\n`;
        for (const n of this.neighbours.keys()) {
            clusterString += (n.id+"\n");
        }
        return clusterString;
    }

}

A = '(t: 101, l:285, b:205.4375, r:453.4375, c:rgb(1, 87, 155))';
B = '(t: 135, l:562, b:179.21875, r:1051.21875, c:rgb(27, 94, 32))';
C = '(t: 258, l:288, b:367.4375, r:355.4375, c:rgb(245, 127, 23))';
D = '(t: 277, l:392, b:472.21875, r:490.21875, c:rgb(183, 28, 28))';
E = '(t: 225, l:632, b:442.21875, r:989.21875, c:rgb(74, 20, 140))';

X1 = '(t: 258, l:288, b:472.21875, r:490.21875)';
X2 = '(t: 135, l:562, b:442.21875, r:1051.21875)';
X3 = '(t: 101, l:285, b:472.21875, r:490.21875)';
X4 = '(t: 101, l:285, b:472.21875, r:1051.21875)';

function mapper(id) {
    if(id == A) return "A";
    if(id == B) return "B";
    if(id == C) return "C";
    if(id == D) return "D";
    if(id == E) return "E";
    if(id == X1) return "X1";
    if(id == X2) return "X2";
    if(id == X3) return "X3";
    if(id == X4) return "X4";
    return "Xnew";
}

function neighsRelsMapToNames(entity) {
    return Array.from(entity.neighbours.keys()).map(n => mapper(n.id));
}

module.exports = Cluster;

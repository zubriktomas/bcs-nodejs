/**
 * Project: Box ClusteringManager Segmentation in Node.js
 * Author: Tomas Zubrik, xzubri00@stud.fit.vutbr.cz
 * Year: 2021
 * License:  GNU GPLv3
 * Description: Main function program block
 */

const sort = require('fast-sort');
const vizualizer = require('./box-vizualizer');
const Cluster = require('../structures/Cluster');
const RTree = require('../structures/RTree');
const Relation = require('../structures/Relation');
const { Selector, SelectorDirection } = require('../structures/Selector');
const { EntityType, isBox, isCluster } = require('../structures/EntityType');

module.exports.process = process;

A = '(t: 101, l:285, b:205.4375, r:453.4375, c:rgb(1, 87, 155))';
B = '(t: 135, l:562, b:179.21875, r:1051.21875, c:rgb(27, 94, 32))';
C = '(t: 258, l:288, b:367.4375, r:355.4375, c:rgb(245, 127, 23))';
D = '(t: 277, l:392, b:472.21875, r:490.21875, c:rgb(183, 28, 28))';
E = '(t: 225, l:632, b:442.21875, r:989.21875, c:rgb(74, 20, 140))';

X1 = '(t: 258, l:288, b:472.21875, r:490.21875)';
X2 = '(t: 135, l:562, b:442.21875, r:1051.21875)';

function mapper(id) {
    if(id == A) return "A";
    if(id == B) return "B";
    if(id == C) return "C";
    if(id == D) return "D";
    if(id == E) return "E";
    if(id == X1) return "X1";
    if(id == X2) return "X2";
}

function neighsRelsMapToNames(entity) {
    return Array.from(entity.neighbours.keys()).map(n => mapper(n.id));
}

function boxesNames(boxes) {
    return Array.from(boxes.keys()).map(id=>mapper(id));
}

function clusterNames(clusters) {
    return Array.from(clusters.keys()).map(id=>mapper(id));
}

function relationsNames(relations) {
    var rels = [];

    for (const rel of relations.values()) {
        rels.push([mapper(rel.entityA.id), mapper(rel.entityB.id)]);
    }

    return rels;
}

class ClusteringManager {

    constructor(extracted) {

        /* Won't be changed */
        this.pageDims = {
            height: extracted.document.height,
            width: extracted.document.width
        };
        
        this.extractedBoxes = new Map(Object.entries(extracted.boxes));
        this.boxes = new Map(Object.entries(extracted.boxes)); // entityId => entity
        this.clusters = new Map();
        this.relations = new Map();

        

        /* Dynamically changed throughout the segmentation process */
        this.tree = this.createRTree();
    }

    createRTree() {
        const tree = new RTree();
        tree.load(Array.from(this.boxes.values()));
        return tree;
    }

    removeContainers() {
        var selector, overlapping;
    
        for (let box of this.boxes.values()) {
            selector = Selector.fromEntity(box);
            overlapping = this.tree.search(selector.narrowBy1Px());
            if(overlapping.length > 2) { 
                this.boxes.delete(box.id);
                this.tree.remove(box);
            }
        }

        for (let box of this.boxes.values()) {
            selector = Selector.fromEntity(box);
            overlapping = this.tree.search(selector.narrowBy1Px());
            if(overlapping.length > 1) { 
                this.boxes.delete(box.id);
                this.tree.remove(box);
            }
        }
    }

    findAllRelations() {
    
        for (let box of this.boxes.values()) {
            box.findDirectNeighbours(this, SelectorDirection.right);    
            box.findDirectNeighbours(this, SelectorDirection.down);
            box.findDirectNeighbours(this, SelectorDirection.left);
            box.findDirectNeighbours(this, SelectorDirection.up);
        }

        for (let relation of this.relations.values()) {
            relation.calcSimilarity();
        }
    }

    enhanceEveryBox() {

        for (let box of this.boxes.values()) {
            box.findDirectNeighbours = findDirectNeighbours;
            box.hasDirectNeighbour = function (otherBox) {
                return box.neighbours.has(otherBox.id);
            };
            box.neighbours = new Map();
            box.boxes = new Map();
            box.toString = toString;
        }
    }

    getBestRelation() {
        var sim = 1000, bestRel;
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
        //   throw Error('Test failed: ' + (message || ''));
            console.log('Test failed: ' + (message || ''));
        }
      }

    test(iteration) {
        console.log(`-----------------------`);
        console.log("iteration: ", iteration);
        if(iteration == 0) {
            // Sets
            this.assert(this.boxes.size == 5, "this.boxes.size == 5");
            this.assert(this.clusters.size == 0, "this.clusters.size == 0");
            this.assert(this.relations.size == 6, "this.relations.size == 6");

            // Boxes Neighbours
            this.assert(this.boxes.get(A).neighbours.size == 2, "a.neighbours.size == 2");
            this.assert(this.boxes.get(B).neighbours.size == 2, "b.neighbours.size == 2");
            this.assert(this.boxes.get(C).neighbours.size == 2, "c.neighbours.size == 2");
            this.assert(this.boxes.get(D).neighbours.size == 3, "d.neighbours.size == 3");
            this.assert(this.boxes.get(E).neighbours.size == 2, "e.neighbours.size == 2");

        } else if(iteration == 1) {
            // Sets
            this.assert(this.boxes.size == 3, "this.boxes.size == 3");
            this.assert(this.clusters.size == 1, "this.clusters.size == 1");
            this.assert(this.relations.size == 4, "this.relations.size == 4");

            // Boxes Neighbours
            this.assert(this.boxes.get(A).neighbours.size == 3, "a.neighbours.size == 3");
            this.assert(this.boxes.get(B).neighbours.size == 2, "b.neighbours.size == 2");
            var c = this.clusters.get(X1).boxes.get(C);
            this.assert(c.neighbours.size == 2, `c.neighbours.size == 2   =>  c.neighbours.size == ${c.neighbours.size}`);
            var d = this.clusters.get(X1).boxes.get(D);
            this.assert(d.neighbours.size == 3, `d.neighbours.size == 3   =>  d.neighbours.size == ${d.neighbours.size}`);
            this.assert(this.boxes.get(E).neighbours.size == 3, "e.neighbours.size == 3");

            // Clusters Boxes
            this.assert(this.clusters.get(X1).boxes.size == 2, `cluster1.boxes.size == 2   =>  ${this.clusters.get(X1).boxes.size} `);
            this.assert(this.clusters.get(X1).neighbours.size == 2, `cluster1.neighbours.size == 2   =>  ${this.clusters.get(X1).neighbours.size} `);

        } else if(iteration == 2) {

            // Sets
            this.assert(this.boxes.size == 1, "this.boxes.size == 1");
            this.assert(this.clusters.size == 2, "this.clsuters.size == 2");
            this.assert(this.relations.size == 3, `this.relations.size == 3   =>   this.relations.size = ${this.relations.size}`);

            // Boxes Neighbours
            this.assert(this.boxes.get(A).neighbours.size == 4, `a.neighbours.size == 4    =>   ${this.boxes.get(A).neighbours.size}    `);
            var b = this.clusters.get(X2).boxes.get(B);
            this.assert(b.neighbours.size == 2, `b.neighbours.size == 2   =>  ${b.neighbours.size}`);
            var c = this.clusters.get(X1).boxes.get(C);
            this.assert(c.neighbours.size == 2, `c.neighbours.size == 2   =>  c.neighbours.size == ${c.neighbours.size}`);
            var d = this.clusters.get(X1).boxes.get(D);
            this.assert(d.neighbours.size == 4, `d.neighbours.size == 4   =>  ${d.neighbours.size}`);
            var e = this.clusters.get(X2).boxes.get(E);
            this.assert(e.neighbours.size == 3, `e.neighbours.size == 3   =>  ${e.neighbours.size}`);
            
            // Clusters Boxes
            this.assert(this.clusters.get(X1).boxes.size == 2, `cluster1.boxes.size == 2   =>  ${this.clusters.get(X1).boxes.size} `);
            this.assert(this.clusters.get(X1).neighbours.size == 2, `cluster1.neighbours.size == 2   =>  ${this.clusters.get(X1).neighbours.size} `);

            // Clusters Boxes
            this.assert(this.clusters.get(X2).boxes.size == 2, `cluster1.boxes.size == 2   =>  ${this.clusters.get(X2).boxes.size} `);
            this.assert(this.clusters.get(X2).neighbours.size == 2, `cluster1.neighbours.size == 2   =>  ${this.clusters.get(X2).neighbours.size} `);


        }
        console.log(`-----------------------\n`);
    }

    printAll() {
        console.log("Boxes: ", boxesNames(this.boxes));
        console.log("Clusters: ", clusterNames(this.clusters));
        console.log("Relations: ", relationsNames(this.relations));
        
        console.log("A neighbours", neighsRelsMapToNames(this.boxes.has(A) ? this.boxes.get(A) : this.clusters.get(X1).boxes.get(A)));
        console.log("B neighbours", neighsRelsMapToNames(this.boxes.has(B) ? this.boxes.get(B) : this.clusters.get(X2).boxes.get(B)));
        console.log("C neighbours", neighsRelsMapToNames(this.boxes.has(C) ? this.boxes.get(C) : this.clusters.get(X1).boxes.get(C)));
        console.log("D neighbours", neighsRelsMapToNames(this.boxes.has(D) ? this.boxes.get(D) : this.clusters.get(X1).boxes.get(D)));
        console.log("E neighbours", neighsRelsMapToNames(this.boxes.has(E) ? this.boxes.get(E) : this.clusters.get(X2).boxes.get(E)));

        if(this.clusters.has(X1)) 
        console.log("X1 neighbours", neighsRelsMapToNames(this.clusters.get(X1)));

        if(this.clusters.has(X2)) 
        console.log("X2 neighbours", neighsRelsMapToNames(this.clusters.get(X2)));

    }

    createClusters() {
        
        var rel;
        // for (let i = 0; i < 2; i++) {
            // this.test(i);
        while(this.relations.size > 0) {

            // console.log("****************** Iteracia:", i, "**************************");
            // this.printAll();
            // console.log("************************************************************\n");


            rel = this.getBestRelation();
        
            if(rel.similarity > 0.5) {
                console.log("Attention: rel.similarity > 0.99");
                // console.log(rel.id);
                break;
            }
            
            var cc = new Cluster(rel.entityA, rel.entityB);

            // cc.addBoxes(rel.entityA);
            // cc.addBoxes(rel.entityB);

            var overlapping = cc.getOverlappingEntities(this.tree);
            
            if(cc.overlapsAnyCluster(overlapping, rel)) {
                console.log("Cluster candidate overlaps some cluster!, how is it possible?");
                // this.clusters.clear();
                // this.clusters.set(cc.id, cc);
                this.relations.delete(rel.id);
                continue;
            }
            
            if(cc.overlapsAnyBox(overlapping, rel)) { 
                console.log("Cluster", cc.id, "overlaps some other box!, what to do now? ");
                // this.clusters.set(cc.id, cc);
                this.relations.delete(rel.id);
                continue;
            } 
            
            this.recalcBoxes(rel);
            this.recalcClusters(rel);
            
            this.updateRTree(cc, rel);
            
            this.recalcNeighboursAndRelations(cc);
            
            this.clusters.set(cc.id, cc);

            // console.log(Array.from(this.relations.values()).map(rel=>rel.similarity));
            // console.log(rel.similarity);
            // console.log();
        }

        


    }
    
    recalcBoxes(rel) {

        // If entity is cluster, delete has no effect
        this.boxes.delete(rel.entityA.id);                       
        this.boxes.delete(rel.entityB.id);
    }

    recalcClusters(rel) {
        // If entity is box, delete has no effect
        this.clusters.delete(rel.entityA.id);
        this.clusters.delete(rel.entityB.id);
    }

    updateRTree(cc, rel) {
        var entityA, entityB;

        entityA = rel.entityA;
        entityB = rel.entityB;

        if(isCluster(entityA)) {
            this.tree.remove(entityA);
        }

        if(isCluster(entityB)) {
            this.tree.remove(entityB);
        }

        this.tree.insert(cc);
    }

    recalcNeighboursAndRelations(cc) {
        
        for (const box of cc.boxes.values()) {
            box.cluster = cc;
        }

        cc.addNeighboursAndRelations();

        for (const [ccNeighbour, ccRel] of cc.neighbours.entries()) {
            ccNeighbour.neighbours.set(cc, ccRel);
            this.relations.set(ccRel.id, ccRel);

            if(isBox(ccNeighbour) && ccNeighbour.cluster) {
                cc.neighbours.delete(ccNeighbour);
                this.relations.delete(ccRel.id);
                // console.log("Box", mapper(ccNeighbour.id), "deleted from cluster ", mapper(cc.id), "eighbours");
            }
        }

        for (const box of cc.boxes.values()) {
            // box.cluster = cc;
            for (const bRelation of box.neighbours.values()) {
                this.relations.delete(bRelation.id);
            }
        }

    }

    vizualize() {
        var clusters = [], boxes = [];

        for (const box of this.extractedBoxes.values()) {
            boxes.push(box);
        }

        for (const cluster of this.clusters.values()) {
            clusters.push(cluster);
        }
        vizualizer.createSvgRepresentation({
            boxes: boxes, 
            clusters: clusters,
            document: {
                width: this.pageDims.width,
                height: this.pageDims.height
            }
        });
    }

    toString() {
        var cmString = `\n |B|: ${this.boxes.size}\n |C|: ${this.clusters.size}\n |R|: ${this.relations.size}\n`;
        return cmString;
    }
}

function findDirectNeighbours(cm, direction) {
    var tree = cm.tree;
    var box = this;

    var selector, neighbours = [];

    const pageWidth = cm.pageDims.width;
    const pageHeight = cm.pageDims.height;

    const selectorWidth = 100;
    const selectorHeight = 50;

    if(direction == SelectorDirection.right){
        
        for (let maxX = box.right + 1 + selectorWidth; maxX < pageWidth + selectorWidth; maxX+=selectorWidth) {
            
            selector = new Selector(box.right+1, box.top+1, maxX, box.bottom-1);
            neighbours = tree.search(selector);    
            
            if(neighbours.length) {
                break;
            }
        }
    } else if (direction == SelectorDirection.down) {
        for (let maxY = box.bottom + 1 + selectorHeight; maxY < pageHeight + selectorHeight; maxY+=selectorHeight) {
        
            selector = new Selector(box.left+1, box.bottom+1, box.right-1, maxY);
            neighbours = tree.search(selector);    
    
            if(neighbours.length) {
                break;
            }
        }
    } else if (direction == SelectorDirection.left) {
        for (let minX = box.left - 1 - selectorWidth; minX > 0 - selectorWidth; minX-=selectorWidth) {
        
            selector = new Selector(minX, box.top + 1, box.left-1 , box.bottom-1);
            neighbours = tree.search(selector);    
    
            if(neighbours.length) {
                break;
            }
        }
    } else if (direction == SelectorDirection.up) {
        for (let minY = box.top - 1 - selectorHeight; minY > 0 - selectorHeight; minY-=selectorHeight) {
        
            selector = new Selector(box.left + 1, minY, box.right - 1, box.top - 1);
            neighbours = tree.search(selector);    
    
            if(neighbours.length) {
                break;
            }
        }
    }

    var tmpRelations = [], shortestDistance = pageWidth + pageHeight;

    for (const neighbour of neighbours) {
        var rel = new Relation(box, neighbour, direction);
        if(rel.absoluteDistance < shortestDistance) {
            tmpRelations.push(rel);
            shortestDistance = rel.absoluteDistance;
        }
    }

    for (const rel of tmpRelations) {
        if(rel.absoluteDistance == shortestDistance) {

            if(!cm.relations.has(rel.id)) {
                cm.relations.set(rel.id, rel);
            }
            box.neighbours.set(rel.entityB, cm.relations.get(rel.id));
            
            if(rel.absoluteDistance > box.maxNeighbourDistance) {
                box.maxNeighbourDistance = rel.absoluteDistance;
            }
        }
    }
  }

function toString() {
    var boxString = `\n Box: ${this.color} \n |Neighbours|: ${this.neighbours.size}`;
    return boxString;
}


function process(extracted) {

    var cm = new ClusteringManager(extracted);
    cm.removeContainers();
    cm.enhanceEveryBox();
    cm.findAllRelations();
    cm.createClusters();
    cm.vizualize();
}
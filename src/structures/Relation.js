 /**
 * Project: Box Clustering Segmentation in Node.js
 * Author: Tomas Zubrik, xzubri00@stud.fit.vutbr.cz
 * Year: 2021
 * License:  GNU GPLv3
 * Description: Functions useful for process of node extraction.
 */

const { SelectorDirection } = require('../structures/Selector');
const {EntityType, isBox, isCluster} = require('./EntityType');

const SQRT3 = Math.sqrt(3);


class Relation {
    constructor(entityA, entityB, direction) {
        this.entityA = entityA;
        this.entityB = entityB;
        this.direction = direction || this.calcDirection(entityA, entityB);
        this.id = this.generateId(entityA, entityB);
        this.absoluteDistance = this.calcAbsoluteDistance(entityA, entityB);
        this.similarity = null;
        // this.cardinality = cardinality;  // this.relativeDistance = null;        // this.shapeSimilarity = null;        // this.colorSimilarity = null;
    }

    generateId(entityA, entityB) {
        if(this.direction == SelectorDirection.right || this.direction == SelectorDirection.down) {
            return entityA.id + entityB.id;
        } else if(this.direction == SelectorDirection.left || this.direction == SelectorDirection.up) {
            return entityB.id + entityA.id;
        } else {
            return null;
        }
    }

    calcProjectedOverlap(a, b) {
        if(a.right >= b.left && a.left <= b.right) {
            return 'x';
        } else if (a.bottom >= b.top && a.top <= b.bottom) {
            return 'y';
        } else {
            return 'o';
        }
    }

    calcDirection(a, b) {
        var pov = this.calcProjectedOverlap(a,b);

        if(a.bottom <= b.top && pov == 'x') {
            return SelectorDirection.down; /* it is reversed according to paper, because we want position of selector */
        } else if (a.top >= b.bottom && pov == 'x') {
            return SelectorDirection.up;
        } else if (a.right <= b.left && pov == 'y') {
            return SelectorDirection.right;
        } else if (a.left >= b.right && pov == 'y') {
            return SelectorDirection.left;
        } else {
            return SelectorDirection.other;
        }
    }

    calcAbsoluteDistance(entityA, entityB) {
        var absoluteDistance;
        if(this.direction == SelectorDirection.right) {
            absoluteDistance = entityB.left - entityA.right;
        } else if (this.direction == SelectorDirection.down) {
            absoluteDistance = entityB.top - entityA.bottom; 
        } else if (this.direction == SelectorDirection.left) {
            absoluteDistance = entityA.left - entityB.right; 
        } else if (this.direction == SelectorDirection.up) {
            absoluteDistance = entityA.top - entityB.bottom; 
        } else {
            absoluteDistance = Infinity;
        }
        return absoluteDistance;
    }

    calcRelativeDistance(boxA, boxB) {
        var relA, relB, maxdA, maxdB;
        
        maxdA = boxA.maxNeighbourDistance;
        maxdB = boxB.maxNeighbourDistance;

        relA = this.absoluteDistance / maxdA;
        relB = this.absoluteDistance / maxdB;

        return (relA + relB) / 2;
    }

    calcShapeSimilarity(boxA, boxB) {
        // Spolocne premenne pre oba vypocty
        var widthA, heightA, widthB, heightB;

        // Premenne pre vypocet ratio
        var ratioA,  ratioB,  ratio, maxRatio, minRatio;

        widthA = boxA.width;
        heightA = boxA.height;
        widthB = boxB.width;
        heightB = boxB.height;

        ratioA = widthA / heightA;
        ratioB = widthB / heightB;

        maxRatio = Math.max(ratioA, ratioB);
        minRatio = Math.min(ratioA, ratioB);
        var pom = (Math.pow(maxRatio, 2) - 1);
        if(pom == 1) {
            pom = 1.01;
        }

        ratio = (maxRatio - minRatio) / ( pom / maxRatio );

        // Premenne pre vypocet size
        var sizeA, sizeB, size;

        sizeA = widthA * heightA;
        sizeB = widthB * heightB;

        size = 1 - (Math.min(sizeA, sizeB) / Math.max(sizeA, sizeB));

        return (ratio + size) / 2;
    }

    calcColorSimilarity(boxA, boxB) {
        var colorA, colorB, rPart, gPart, bPart;

        colorA = getRgbFromString(boxA.color);
        colorB = getRgbFromString(boxB.color);

        rPart = Math.pow((colorA.r - colorB.r) / 255, 2);
        gPart = Math.pow((colorA.g - colorB.g) / 255, 2);
        bPart = Math.pow((colorA.b - colorB.b) / 255, 2);

        return Math.sqrt(rPart + gPart + bPart) / SQRT3;
    }

    calcBaseSimilarity(boxA, boxB) {
        var relativeDistance = this.calcRelativeDistance(boxA, boxB);

        /* They are the same box, or are not semi-aligned */
        if(relativeDistance <= 0) {
            return 0;
        } else if (relativeDistance >= 1) {
            return 1;
        } else {
            var relDist = relativeDistance;
            var shapeSim = this.calcShapeSimilarity(boxA, boxB);
            var colorSim = this.calcColorSimilarity(boxA, boxB);
            // var sim = (relDist*0.2 + shapeSim*0.25 + colorSim*0.1) / 3;
            var sim = (relDist + shapeSim + colorSim) / 3;
            // return sim <= 1 ? sim : 1;
            return sim;
        }
    }

    
    calcSimilarity() {
        var entityA = this.entityA;
        var entityB = this.entityB;

        if(isBox(entityA) && isBox(entityB)) {
            //console.log("calcBaseSimilarity:");
            this.similarity = this.calcBaseSimilarity(entityA, entityB);
        } else {
            //console.log("calcClusterSimilarity", mapper(entityA.id), mapper(entityB.id));
            this.similarity = this.calcClusterSimilarity(entityA, entityB);
            // console.log(entityA.id, entityB.id, this.similarity);
            // if(this.similarity == 0) this.similarity = 1;
            //console.log("    => ", mapper(entityA.id), mapper(entityB.id), "simil: ", this.similarity);
        }
    }
    
    calcClusterSimilarity(entityA, entityB) {

        if(isCluster(entityA)) {
            

            // console.log(mapper(entityA.id), mapper(entityB.id));
            // console.log("                                         ==>>>>>>>>>>>>>> ",this.calcCardinality(entityA, entityB));

            // console.log("csim:",this.calcCumulSimilarity(entityA, entityB));

            return (this.calcCumulSimilarity(entityA, entityB) / this.calcCardinality(entityA, entityB));
        }

        if(isCluster(entityB)) {
            return (this.calcCumulSimilarity(entityB, entityA) / this.calcCardinality(entityB, entityA));
        }
    }

    calcCardinality(cluster, entity) {

        var card = 0;

        if(isCluster(entity)) {
            for (const cBox of cluster.boxes.values()) {
                for (const eBox of entity.boxes.values()) {
                    // if(cBox.neighbours.has(eBox) || eBox.neighbours.has(cBox)) {
                    if(cBox.neighbours.has(eBox)) {
                        card+=1;
                    }
                }
            }
        } else {
            for (const cBox of cluster.boxes.values()) {
                card = cBox.neighbours.has(entity) ? card+1 : card;
            }
        }
        
        return card ? card : 1;
    }

    calcCumulSimilarity(cluster, entity) {
        var rel, cumulSimilarity = 0;
        if(isBox(entity)) {
            
            
            for (const cBox of cluster.boxes.values()) {
                rel = cBox.neighbours.get(entity) || entity.neighbours.get(cBox);
                // if(!rel) rel = new Relation(cBox, entity); rel.calcSimilarity();
                cumulSimilarity += rel ? rel.similarity : 0;
            }
        } else {
            for (const cBox of cluster.boxes.values()) {
                var sim = (this.calcCumulSimilarity(entity, cBox) / this.calcCardinality(entity, cBox));
                cumulSimilarity += sim;
            }
        }
        return cumulSimilarity;
    }
    

    toString() {
        var relString = `\n Relation A: ${this.entityA.id} \n Relation B: ${this.entityB.id} \n Abs Distance: ${this.absoluteDistance}\n Direction:${this.direction} \n`;
        relString += ` Similarity: ${this.similarity}\n`;
        return relString;
    }
}

function getRgbFromString(rgbString) {
    var rgbArray, rgb = {}; 

    rgbArray = rgbString.replace(/[^\d,]/g, '').split(',');

    /* RGB components normalized to interval <0,1> */
    rgb.r = Math.floor(rgbArray[0]);
    rgb.g = Math.floor(rgbArray[1]);
    rgb.b = Math.floor(rgbArray[2]);

    if(rgbArray.length == 4) {
        rgb.a = parseInt(rgbArray[3]);
    }
    return rgb;
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

module.exports = Relation;
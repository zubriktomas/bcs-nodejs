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
        this.direction = null;
        this.id = this.generateId(entityA, entityB, direction);
        // this.cardinality = cardinality;
        this.absoluteDistance = this.calcAbsoluteDistance(entityA, entityB, this.direction);
        // this.relativeDistance = null;
        // this.shapeSimilarity = null;
        // this.colorSimilarity = null;
        this.similarity = null;
    }

    generateId(entityA, entityB, direction) {
        direction = direction || this.calcDirection(entityA, entityB);
        this.direction = direction;
        if(direction == SelectorDirection.right || direction == SelectorDirection.down) {
            return entityA.id + entityB.id;
        } else if(direction == SelectorDirection.left || direction == SelectorDirection.up) {
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
            return SelectorDirection.down;
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

    calcAbsoluteDistance(entityA, entityB, direction) {
        var absoluteDistance;
        if(direction == SelectorDirection.right) {
            absoluteDistance = entityB.left - entityA.right;
        } else if (direction == SelectorDirection.down) {
            absoluteDistance = entityB.top - entityA.bottom; 
        } else if (direction == SelectorDirection.left) {
            absoluteDistance = entityA.left - entityB.right; 
        } else if (direction == SelectorDirection.up) {
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

        ratio = (maxRatio - minRatio) / ( (Math.pow(maxRatio, 2) - 1) / maxRatio );

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
        if(relativeDistance == 0 || relativeDistance == Infinity) {
            return 0;
        } else if (relativeDistance == 1) {
            return 1;
        } else {
            return (relativeDistance + this.calcShapeSimilarity(boxA, boxB) + this.calcColorSimilarity(boxA, boxB)) / 3;
        }
    }

    
    calcSimilarity() {
        var entityA = this.entityA;
        var entityB = this.entityB;

        if(isBox(entityA) && isBox(entityB)) {
            this.similarity = this.calcBaseSimilarity(entityA, entityB);
        } else {
            this.similarity = this.calcClusterSimilarity(entityA, entityB);
        }
    }
    
    calcClusterSimilarity(entityA, entityB) {

        if(isCluster(entityA)) {
            return (this.calcCumulSimilarity(entityA, entityB) / this.calcCardinality(entityA, entityB));
        }

        if(isCluster(entityB)) {
            return (this.calcCumulSimilarity(entityB, entityA) / this.calcCardinality(entityB, entityA));
        }
    }

    calcCardinality(cluster, entity) {
        var card = 0;
        for (const cBox of cluster.boxes.values()) {
            card = cBox.neighbours.has(entity) ? card+1 : card;
        }
        return card;
    }

    calcCumulSimilarity(cluster, entity) {
        var rel, cumulSimilarity = 0;

        if(isBox(entity)) {
            for (const cBox of cluster.boxes.values()) {
                // console.log(cBox.id);

                if(cBox.neighbours.has(entity)) {
                    rel = cBox.neighbours.get(entity);    
                } else if(entity.neighbours.has(cBox)) {
                    rel = entity.neighbours.get(cBox)
                } else {
                    // rel = new Relation(cBox, entity, null);
                    // rel.calcSimilarity();
                }

                // rel = cBox.neighbours.get(entity) || entity.neighbours.get(cBox) || (new Relation(cBox, entity, null)).calcSimilarity();
                cumulSimilarity += rel.similarity;
            }
        } else {
            for (const cBox of cluster.boxes.values()) {
                cumulSimilarity += (this.calcCumulSimilarity(entity, cBox) / this.calcCardinality(entity, cBox));
            }
        }

        // console.log(cumulSimilarity);

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

module.exports = Relation;
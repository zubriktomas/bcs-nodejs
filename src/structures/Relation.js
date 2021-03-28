 /**
 * Project: Box Clustering Segmentation in Node.js
 * Author: Tomas Zubrik, xzubri00@stud.fit.vutbr.cz
 * Year: 2021
 * License:  GNU GPLv3
 * Description: Functions useful for process of node extraction.
 */

const { SelectorDirection } = require('../structures/Selector');


class Relation {
    constructor(entityA, entityB, direction) {
        this.entityA = entityA;
        this.entityB = entityB;
        this.direction = direction;
        this.id = this.generateId();
        this.absoluteDistance = this.calculateAbsoluteDistance();
        this.relativeDistance = null;
        this.shapeSimilarity = null;
        this.colorSimilarity = null;
        this.similarity = null;
        this.alignmentScore = null;
        this.cardinality = null;
    }

    generateId() {
        if(this.direction == SelectorDirection.right || this.direction == SelectorDirection.down) {
            return this.entityA.id + this.entityB.id;
        } else {
            return this.entityB.id + this.entityA.id;
        }
    }

    calculateAbsoluteDistance() {
        var absoluteDistance;
        if(this.direction == SelectorDirection.right) {
            absoluteDistance = this.entityB.left - this.entityA.right;
        } else if (this.direction == SelectorDirection.down) {
            absoluteDistance = this.entityB.top - this.entityA.bottom; 
        } else if (this.direction == SelectorDirection.left) {
            absoluteDistance = this.entityA.left - this.entityB.right; 
        } else if (this.direction == SelectorDirection.up) {
            absoluteDistance = this.entityA.top - this.entityB.bottom; 
        }
        return absoluteDistance;
    }

    calculateRelativeDistance() {
        var relA, relB, maxdA, maxdB;

        maxdA = this.entityA.maxNeighbourDistance;
        maxdB = this.entityB.maxNeighbourDistance;

        relA = this.absoluteDistance / maxdA;
        relB = this.absoluteDistance / maxdB;

        this.relativeDistance = (relA + relB) / 2;
    }

    calculateShapeSimilarity() {
        // Spolocne premenne pre oba vypocty
        var widthA, heightA, widthB, heightB;

        // Premenne pre vypocet ratio
        var ratioA,  ratioB,  ratio, maxRatio, minRatio;

        widthA = this.entityA.width;
        heightA = this.entityA.height;
        widthB = this.entityB.width;
        heightB = this.entityB.height;

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

        this.shapeSimilarity = (ratio + size) / 2;
    }

    calculateColorSimilarity() {
        var colorA, colorB, rPart, gPart, bPart;

        colorA = getRgbFromString(this.entityA.color);
        colorB = getRgbFromString(this.entityB.color);

        rPart = Math.pow(colorA.r - colorB.r, 2);
        gPart = Math.pow(colorA.g - colorB.g, 2);
        bPart = Math.pow(colorA.b - colorB.b, 2);

        this.colorSimilarity = Math.sqrt(rPart + gPart + bPart) / Math.sqrt(3);
    }

    calculateBaseSimilarity() {
        if(this.relativeDistance == 0) {
            this.similarity = 0;
        } else if (this.relativeDistance == 1) {
            this.similarity = 1;
        } else {
            this.similarity = (this.relativeDistance + this.shapeSimilarity + this.colorSimilarity) / 3;
        }
    }
}

function getRgbFromString(rgbString) {
    var rgbArray, rgb = {}; 

    rgbArray = rgbString.replace(/[^\d,]/g, '').split(',');

    /* RGB components normalized to interval <0,1> */
    rgb.r = Math.floor(rgbArray[0])/255;
    rgb.g = Math.floor(rgbArray[1])/255;
    rgb.b = Math.floor(rgbArray[2])/255;

    if(rgbArray.length == 4) {
        rgb.a = parseInt(rgbArray[3]);
    }
    return rgb;
}

module.exports = Relation;
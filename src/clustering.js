const RBush = require('rbush');
const sort = require('fast-sort');

module.exports.process = process;

var globals = {};
globals.allRelations = [];
globals.uniqueRelations = {};
globals.clusters = [];

class BoxRelation {
    constructor(boxA, boxB, direction) {
        this.id = this.generateId(boxA, boxB, direction);
        this.boxA = boxA;
        this.boxB = boxB;
        this.direction = direction;
        this.absoluteDistance = this.calculateAbsoluteDistance(boxA, boxB, direction);
        this.relativeDistance = null;
        this.shapeSimilarity = null;
        this.colorSimilarity = null;
        this.similarity = null;
        this.alignmentScore = null;
        this.cardinality = null;
    }

    generateId(boxA, boxB, direction) {
        if(direction == SelectorDirection.right || direction == SelectorDirection.down) {
            return boxA.id + boxB.id;
        } else {
            return boxB.id + boxA.id;
        }
    }

    calculateAbsoluteDistance(boxA, boxB, direction) {
        var absoluteDistance;
        if(direction == SelectorDirection.right) {
            absoluteDistance = boxB.left - boxA.right;
        } else if (direction == SelectorDirection.down) {
            absoluteDistance = boxB.top - boxA.bottom; 
        } else if (direction == SelectorDirection.left) {
            absoluteDistance = boxA.left - boxB.right; 
        } else if (direction == SelectorDirection.up) {
            absoluteDistance = boxA.top - boxB.bottom; 
        }
        return absoluteDistance;
    }

    calculateRelativeDistance() {
        var relA, relB, maxdA, maxdB;

        maxdA = this.boxA.maxNeighbourDistance;
        maxdB = this.boxB.maxNeighbourDistance;

        relA = this.absoluteDistance / maxdA;
        relB = this.absoluteDistance / maxdB;

        this.relativeDistance = (relA + relB) / 2;
    }

    calculateShapeSimilarity() {
        // Spolocne premenne pre oba vypocty
        var widthA, heightA, widthB, heightB;

        // Premenne pre vypocet ratio
        var ratioA,  ratioB,  ratio, maxRatio, minRatio;

        widthA = this.boxA.width;
        heightA = this.boxA.height;
        widthB = this.boxB.width;
        heightB = this.boxB.height;

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

        colorA = getRgbFromString(this.boxA.color);
        colorB = getRgbFromString(this.boxB.color);

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

class MyRBush extends RBush {
    toBBox(box) { return {minX: box.left, minY: box.top, maxX: box.right, maxY: box.bottom, id:box.id}; }
    compareMinX(a, b) { return a.left - b.left; }
    compareMinY(a, b) { return a.top - b.top; }
}

class Cluster {
    constructor(boxA, boxB) {
        this.left = Math.min(boxA.left, boxB.left);
        this.top = Math.min(boxA.top, boxB.top);
        this.right = Math.max(boxA.right, boxB.right);
        this.bottom = Math.max(boxA.bottom, boxB.bottom);
        this.boxes = this.assignBoxes(boxA, boxB);
        this.neighbours = {};
        // this.cumulativeSimilarity =
    }

    tryMerge() {

    }

    recalculateCoordinates() {

    }

    assignBoxes(boxA, boxB) {
        var boxes = {};
        boxes[boxA.id] = boxA;
        boxes[boxB.id] = boxB;
        return boxes;
    }

    getNeighbours(boxA, boxB) {

        for (let i = 0; i < boxA.neighbours.length; i++) {
            neighbourId = boxA.neighboursIds[i];
            if(neighbourOfA != boxA.id && neighbourOfA != boxB.id) {
                // this.neighbours.push(globals.boxes);
                this.neighboursIds[neighbourId] = neighbourId;
            }
        }

    }
}

/* Selector Direction Enum JavaScript best practice */
const SelectorDirection = Object.freeze({"right":"right", "down":"down", "left":"left", "up":"up", "vertical": 5, "horizontal": 6});

function createMyRBush(boxes) {
    const tree = new MyRBush();
    tree.load(boxes);
    return tree;
}

function findRelationsRight(box, info) {
}

// It is expected to find one, but possibly multiple
function findNeighbours(box, direction) {
    var selector, neighbours = [];

    const tree = globals.tree;
    const pageWidth = globals.pageWidth;
    const pageHeight = globals.pageHeight;
    const selectorWidth = 50;
    const selectorHeight = 50;

    if(direction == SelectorDirection.right){
        for (let i = box.right + 1 + selectorWidth; i < pageWidth + selectorWidth; i+=selectorWidth) {
        
            selector = {minX: box.right+1, minY: box.top+1, maxX: i, maxY: box.bottom-1};
            neighbours = tree.search(selector);    
    
            if(neighbours.length) {
                break;
            }
        }
    } else if (direction == SelectorDirection.down) {
        for (let i = box.bottom + 1 + selectorHeight; i < pageHeight + selectorHeight; i+=selectorHeight) {
        
            selector = {minX: box.left+1, minY: box.bottom+1, maxX: box.right-1, maxY: i};
            neighbours = tree.search(selector);    
    
            if(neighbours.length) {
                break;
            }
        }
    } else if (direction == SelectorDirection.left) {
        for (let i = box.left - 1 - selectorWidth; i > 0 - selectorWidth; i-=selectorWidth) {
        
            selector = {minX: i, minY: box.top + 1, maxX: box.left-1 , maxY: box.bottom-1};
            neighbours = tree.search(selector);    
    
            if(neighbours.length) {
                break;
            }
        }
    } else if (direction == SelectorDirection.up) {
        for (let i = box.top - 1 - selectorHeight; i > 0 - selectorHeight; i-=selectorHeight) {
        
            selector = {minX: box.left + 1, minY: i, maxX: box.right - 1 , maxY: box.top - 1};
            neighbours = tree.search(selector);    
    
            if(neighbours.length) {
                break;
            }
        }
    }

    var rel, tmpRelations = [], shortestDistance = pageWidth + pageHeight;

    for (let i = 0; i < neighbours.length; i++) {
        rel = new BoxRelation(box, neighbours[i], direction);

        tmpRelations.push(rel);
        if(rel.absoluteDistance < shortestDistance) {
            shortestDistance = rel.absoluteDistance;
        }
    }

    for (let i = 0; i < tmpRelations.length; i++) {
        rel = tmpRelations[i];
        
        if(rel.absoluteDistance == shortestDistance) {
            globals.uniqueRelations[rel.id] = rel;

            box.relationsIds.push(rel.id);
            box.neighboursIds.push(rel.boxB.id);

            // !!! Uneffective !!! 
            // box.relations[rel.id] = rel;
            // // globals.allRelations.push(rel);
            // if(box.id == rel.boxA.id) {
            //     box.neighbours[rel.boxB.id] = rel.boxB;
            // } else {
            //     box.neighbours[rel.boxA.id] = rel.boxA;
            // }

            if(rel.absoluteDistance > box.maxNeighbourDistance) {
                box.maxNeighbourDistance = rel.absoluteDistance;
            }
        }
    }
}

function findDirectNeighbours(box) {

    findNeighbours(box, SelectorDirection.right);    
    findNeighbours(box, SelectorDirection.down);
    findNeighbours(box, SelectorDirection.left);
    findNeighbours(box, SelectorDirection.up);
}

function getRgbFromString(rgbString) {
    var rgbArray, rgb = {}; 

    rgbArray = rgbString.replace(/[^\d,]/g, '').split(',');

    rgb.r = parseInt(rgbArray[0])/255;
    rgb.g = parseInt(rgbArray[1])/255;
    rgb.b = parseInt(rgbArray[2])/255;

    if(rgbArray.length == 4) {
        rgb.a = parseInt(rgbArray[3]);
    }
    return rgb;
}

function assignGlobals(extracted) {
    globals.tree = createMyRBush(extracted.boxes);
    globals.boxes = extracted.boxes;
    globals.pageWidth = extracted.document.width;
    globals.pageHeight = extracted.document.height;
}


function mergeTest(rel) {

    var threshold = 0.5;

    if(rel.similarity < threshold) {
        return true;
    } else {
        return false;
    }
}

function createCluster(rel) {

    var cluster = new Cluster(rel.boxA, rel.boxB);

    globals.clusters.push(cluster);
    

}


function process(extracted) {

    assignGlobals(extracted);

    console.time("clustering");
    /************************************************************************ */

    // console.time("map");
    var boxes = Object.values(extracted.boxesMap);
    var boxesCount = boxes.length;
        for (let i = 0; i < boxesCount; i++) {
            findDirectNeighbours(boxes[i]);
        }
    // console.timeEnd("map");
    // Object.values(extracted.boxesMap).forEach(box => {
    //     findDirectNeighbours(box);
    // });

    // extracted.boxes.forEach(box => {
    //     findDirectNeighbours(box);
    // });

    // console.time("arr");
    // var boxes = extracted.boxes;
    // var boxesCount = boxes.length;
    //     for (let i = 0; i < boxesCount; i++) {
    //         findDirectNeighbours(boxes[i]);
    //     }
    // console.timeEnd("arr");
    // for (let i = 0; i < globals.allRelations.length; i++) {
    //     var rel = globals.allRelations[i];
    //     rel.calculateRelativeDistance();
    //     rel.calculateShapeSimilarity();
    //     rel.calculateColorSimilarity();
    //     rel.calculateBaseSimilarity();
    // }

    var uniqrels = Object.values(globals.uniqueRelations);

    for (let i = 0; i < uniqrels.length; i++) {
        var rel = uniqrels[i];
        rel.calculateRelativeDistance();
        rel.calculateShapeSimilarity();
        rel.calculateColorSimilarity();
        rel.calculateBaseSimilarity();
    }
    
    // console.log(uniqrels.map(rel => rel.similarity));
    // console.log("******************************************");
    sort(uniqrels).asc(rel => rel.similarity);
    // console.log(uniqrels.map(rel => rel.similarity));
    // console.log(globals.boxes.map(b=>b.relations));

    // while(uniqrels.length > 0) {
    //     rel = uniqrels[0];
    //     uniqrels = uniqrels.slice(1);
    
    //     if(mergeTest(rel)) {
    //         createCluster(rel);
    //     }
    // }

    // console.log(globals.clusters[0]);
    // 
    // console.log("Areas count: ", globals.boxes.length);
    // console.log("Unique relations count:", uniqrels.length);
    // console.log("All relations count:", globals.allRelations.length);


    console.timeEnd("clustering");
    /************************************************************************ */
    
    // console.log("boxesmap size: ", Object.keys(extracted.boxesMap).length);
    // console.log("boxes size: ", extracted.boxes.length);
    
}




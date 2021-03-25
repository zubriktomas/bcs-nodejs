const RBush = require('rbush');
const sort = require('fast-sort');
const webPageCreator = require('./create-web-page');

module.exports.process = process;

var globals = {};

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

class BoxRelation {
    constructor(boxAId, boxBId, direction) {
        this.boxA = globals.boxesMap[boxAId];
        this.boxB = globals.boxesMap[boxBId];
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
            return this.boxA.id + this.boxB.id;
        } else {
            return this.boxB.id + this.boxA.id;
        }
    }

    calculateAbsoluteDistance() {
        var absoluteDistance;
        if(this.direction == SelectorDirection.right) {
            absoluteDistance = this.boxB.left - this.boxA.right;
        } else if (this.direction == SelectorDirection.down) {
            absoluteDistance = this.boxB.top - this.boxA.bottom; 
        } else if (this.direction == SelectorDirection.left) {
            absoluteDistance = this.boxA.left - this.boxB.right; 
        } else if (this.direction == SelectorDirection.up) {
            absoluteDistance = this.boxA.top - this.boxB.bottom; 
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
    toBBox(entity) { return {minX: entity.left, minY: entity.top, maxX: entity.right, maxY: entity.bottom, id:entity.id}; }
    compareMinX(a, b) { return a.left - b.left; }
    compareMinY(a, b) { return a.top - b.top; }
}

class Cluster {
    constructor(boxA, boxB) {
        this.left = Math.min(boxA.left, boxB.left);
        this.top = Math.min(boxA.top, boxB.top);
        this.right = Math.max(boxA.right, boxB.right);
        this.bottom = Math.max(boxA.bottom, boxB.bottom);
        this.id = `(t: ${this.top}, l:${this.left}, b:${this.bottom}, r:${this.right})`;
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

    getNeighbours() {

        for (let i = 0; i < boxA.neighbours.length; i++) {
            neighbourId = boxA.neighboursIds[i];
            if(neighbourOfA != boxA.id && neighbourOfA != boxB.id) {
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

// It is expected to find one, but possibly multiple
function findNeighbours(box, direction) {
    var selector, neighbours = [];

    const tree = globals.tree;
    const pageWidth = globals.pageWidth;
    const pageHeight = globals.pageHeight;
    const selectorWidth = 100;
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

    var rel, relations = [], shortestDistance = pageWidth + pageHeight;

    for (let i = 0; i < neighbours.length; i++) {
        rel = new BoxRelation(box.id, neighbours[i].id, direction);

        relations.push(rel);
        if(rel.absoluteDistance < shortestDistance) {
            shortestDistance = rel.absoluteDistance;
        }
    }

    for (let i = 0; i < relations.length; i++) {
        rel = relations[i];
        
        if(rel.absoluteDistance == shortestDistance) {
            globals.uniqueRelations[rel.id] = rel;

            box.relationsIds.push(rel.id);
            box.neighboursIds.push(rel.boxB.id);

            if(rel.absoluteDistance >= box.maxNeighbourDistance) {
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

function findAllRelations() {
    var boxes = Object.values(globals.boxesMap);
    var boxesCount = boxes.length;
    for (let i = 0; i < boxesCount; i++) {
        findDirectNeighbours(boxes[i]);
    }

    var uniqueRelations = Object.values(globals.uniqueRelations);

    for (let i = 0; i < uniqueRelations.length; i++) {
        var rel = uniqueRelations[i];
        rel.calculateRelativeDistance();
        rel.calculateShapeSimilarity();
        rel.calculateColorSimilarity();
        rel.calculateBaseSimilarity();
    }
    
    sort(uniqueRelations).asc(rel => rel.similarity);

    return uniqueRelations;
}

function assignGlobals(extracted) {
    globals.tree = createMyRBush(Object.values(extracted.boxesMap));
    globals.boxesMap = extracted.boxesMap;
    globals.pageWidth = extracted.document.width;
    globals.pageHeight = extracted.document.height;
    globals.uniqueRelations = {};
    globals.clusters = {};
}


function mergeTest(rel) {

    var threshold = 0.5;

    if(rel.similarity < threshold) {
        // console.log("Merge test passed!");
        return true;
    } else {
        // console.log("Merge test failed!");
        return false;
    }
}

function createCluster(rel) {

    var cluster = new Cluster(rel.boxA, rel.boxB);

    globals.clusters[cluster.id] = cluster;
    
}

function createClusters(relations) {

    while(relations.length > 0) {
        rel = relations[0];
        relations = relations.slice(1);
    


        if(!mergeTest(rel)) {
            continue;
        }

        createCluster(rel);
    }
}

function createSvgRepresentation() {
    var boxes = Object.values(globals.boxesMap);
    var clusters = Object.values(globals.clusters);
    var document = {width: globals.pageWidth, height: globals.pageHeight};
    webPageCreator.runServer({
        boxes: boxes, 
        clusters: clusters, 
        document: document
    });

}

function removeContainers() {
    var boxes = Object.values(globals.boxesMap);
    var selector, inside, box;

    for (let i = 0; i < boxes.length; i++) {
        box = boxes[i];
        selector = {minX: box.left+1, minY: box.top+1, maxX: box.right-1, maxY: box.bottom-1};
        inside = globals.tree.search(selector);
        if(inside.length > 1) { //maybe bigger overlays
            delete globals.boxesMap[box.id];
            globals.tree.remove(box);
        }
    }
}

function process(extracted) {

    assignGlobals(extracted);

    console.time("createClusters");
        removeContainers();
        var uniqueRelations = findAllRelations();
        createClusters(uniqueRelations);
    console.timeEnd("createClusters");

    createSvgRepresentation();
    
    // console.log(globals.clusters);
    // console.log(Object.values(globals.boxesMap)[0]);
}
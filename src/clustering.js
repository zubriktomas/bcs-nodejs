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

const EntityType = Object.freeze({box: 'box', cluster: 'cluster'})

class MyRBush extends RBush {
    toBBox(entity) { return {minX: entity.left, minY: entity.top, maxX: entity.right, maxY: entity.bottom, id:entity.id, type: entity.type}; }
    compareMinX(a, b) { return a.left - b.left; }
    compareMinY(a, b) { return a.top - b.top; }
}

/* Selector Direction Enum JavaScript best practice */
const SelectorDirection = Object.freeze({"right":"right", "down":"down", "left":"left", "up":"up"});

class Selector {
    constructor(minX, minY, maxX, maxY) {
        this.minX = minX;
        this.minY = minY;
        this.maxX = maxX;
        this.maxY = maxY;
    }

    narrowBy1Px() {
        this.minX += 1;
        this.minY += 1;
        this.maxX -= 1;
        this.maxY -= 1;
    }
}

class Cluster {
    constructor(boxA, boxB) {
        this.left = Math.min(boxA.left, boxB.left);
        this.top = Math.min(boxA.top, boxB.top);
        this.right = Math.max(boxA.right, boxB.right);
        this.bottom = Math.max(boxA.bottom, boxB.bottom);
        this.id = `(t: ${this.top}, l:${this.left}, b:${this.bottom}, r:${this.right})`;
        this.type = EntityType.cluster;
        this.boxes = this.assignBoxes(boxA, boxB);
        this.neighbours = {};
        this.overlappingEntities = this.getOverlappingEntities();
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

    getOverlappingEntities() {

        const tree = globals.tree;
        
        /* Search entities in Rtree on coordinates specified by cluster itself */
        var overlappingEntities = tree.search(this);

        return overlappingEntities;
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
}

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
        globals.uniqueRelations[rel.id] = rel;
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

function createClusters(relations) {

    while(relations.length > 0) {
        rel = relations[0];
        relations.shift();
    

        if(rel.similarity > 0.5) {
            continue;
        }

        var clusterCandidate = new Cluster(rel.boxA, rel.boxB);

        if(clusterCandidate.overlapsAnyCluster()) {
            continue;
        }

        if(clusterCandidate.overlapsAnyBox()) { 
            console.log("Cluster", clusterCandidate.id, "overlaps some other box!");
        }

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

/* TODO refactoring */
function removeContainers() {
    var boxes = Object.values(globals.boxesMap);
    var selector, inside, box;

    for (let i = 0; i < boxes.length; i++) {
        box = boxes[i];
        selector = {minX: box.left+1, minY: box.top+1, maxX: box.right-1, maxY: box.bottom-1};
        inside = globals.tree.search(selector);
        if(inside.length > 2) { //maybe bigger overlays
            delete globals.boxesMap[box.id];
            globals.tree.remove(box);
        }
    }

    boxes = Object.values(globals.boxesMap);
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
        var relations = findAllRelations();
        createClusters(relations);
    console.timeEnd("createClusters");

    createSvgRepresentation();
    
    // console.log(globals.clusters);
    // console.log(Object.values(globals.boxesMap)[0]);
}
const RBush = require('rbush');
const sort = require('fast-sort');

module.exports.process = process;

var globals = {};
globals.allRelations = [];
globals.uniqueRelations = {};

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

/* Selector Direction Enum JavaScript best practice */
const SelectorDirection = Object.freeze({"right":"right", "down":"down", "left":"left", "up":"up", "vertical": 5, "horizontal": 6});

function createMyRBush(boxes) {
    const tree = new MyRBush();
    tree.load(boxes);
    return tree;
}

// It is expected to find one, but possibly multiple
function findNeighbours(box, direction) {
    var selector, neighbours = [], directNeighbours = [];

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

    var rel, relations = []; shortestDistance = pageWidth + pageHeight;

    for (let i = 0; i < neighbours.length; i++) {
        rel = new BoxRelation(box, neighbours[i], direction);

        relations.push(rel);
        if(rel.absoluteDistance < shortestDistance) {
            shortestDistance = rel.absoluteDistance;
        }

       
    }

    for (let i = 0; i < relations.length; i++) {
        rel = relations[i];
        
        if(rel.absoluteDistance == shortestDistance) {
            globals.uniqueRelationsIds.add(rel.id);
            globals.uniqueRelations[rel.id] = rel;

            directNeighbours.push(rel.boxB);
            box.relations.push(rel);
            globals.allRelations.push(rel);


            if(rel.absoluteDistance > box.maxNeighbourDistance) {
                box.maxNeighbourDistance = rel.absoluteDistance;
            }
        }

        
    }

    return directNeighbours;
}

function findDirectNeighbours(box) {

    var r = [], d = [];

    r = findNeighbours(box, SelectorDirection.right);    
    d = findNeighbours(box, SelectorDirection.down);
    l = findNeighbours(box, SelectorDirection.left);
    u = findNeighbours(box, SelectorDirection.up);

    directNeighbours = [];
    directNeighbours = directNeighbours.concat(r);
    directNeighbours = directNeighbours.concat(d);
    directNeighbours = directNeighbours.concat(l);
    directNeighbours = directNeighbours.concat(u);


    // console.log(box.id);
    // console.log(directNeighbours.map(x => x.id));
    // console.log("\n\n");
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


function process(extracted) {

    /* Create R*-Tree from boxes */
    globals.tree = createMyRBush(extracted.boxes);
    globals.boxes = extracted.boxes;
    globals.pageWidth = extracted.document.width;
    globals.pageHeight = extracted.document.height;

    const boxesCount = globals.boxes.length;

    console.time("findDirectNeighbours");

    for (let i = 0; i < boxesCount; i++) {
        var box = globals.boxes[i];
        findDirectNeighbours(box);    
    }

    const relationsCount = globals.allRelations.length;

    
    for (let i = 0; i < relationsCount; i++) {
        var rel = globals.allRelations[i];
        rel.calculateRelativeDistance();
        rel.calculateShapeSimilarity();
        rel.calculateColorSimilarity();
        rel.calculateBaseSimilarity();
    }
    
    var bestSimilarity = 1;
    var theMostSimilarPair = null;
    for (let i = 0; i < relationsCount; i++) {
        var rel = globals.allRelations[i];

        if(rel.similarity < bestSimilarity) {
            bestSimilarity = rel.similarity;
            theMostSimilarPair = rel;
        }
    }

    // console.log("The most similar are: ");
    // console.log(theMostSimilarPair.boxA.id);
    // console.log(theMostSimilarPair.boxB.id);
  
    Object.keys(globals.uniqueRelations).forEach(relId => {
        console.log(globals.uniqueRelations[relId].similarity);
    });

    
    console.log("\_\_\_");

    var uniqrels = Object.values(globals.uniqueRelations);
    sort(uniqrels).asc(rel => rel.similarity);

    uniqrels.forEach(rel => {
        console.log(rel.similarity);
    });

    console.timeEnd("findDirectNeighbours");

    // console.log(Object.keys(globals.uniqueRelations).length);
    // console.log(globals.allRelations.length);
    // console.log(globals.uniqueRelationsIds.size);



}




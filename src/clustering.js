const RBush = require('rbush');

module.exports.process = process;

var globals = {};
globals.allRelations = [];

class BoxRelation {
    constructor(boxA, boxB, direction) {
        this.boxA = boxA;
        this.boxB = boxB;
        this.direction = direction;
        this.absoluteDistance = this.calculateAbsoluteDistance(boxA, boxB, direction);
        this.similarity = null;
        this.alignmentScore = null;
        this.cardinality = null;
    }

    calculateAbsoluteDistance(boxA, boxB, direction) {
        var absoluteDistance;
        if(direction == SelectorDirection.right) {
            absoluteDistance = boxB.left - boxA.right;
        } else if (direction == SelectorDirection.down) {
            absoluteDistance = boxB.top - boxA.bottom; 
        } else if (direction == SelectorDirection.left) {
            absoluteDistance = boxA.right - boxB.left; 
        } else if (direction == SelectorDirection.up) {
            absoluteDistance = boxA.bottom - boxB.top; 
        }
        return absoluteDistance;
    }
}

class MyRBush extends RBush {
    toBBox(box) { return {minX: box.left, minY: box.top, maxX: box.right, maxY: box.bottom, id:box.id}; }
    compareMinX(a, b) { return a.left - b.left; }
    compareMinY(a, b) { return a.top - b.top; }
}

/* Selector Direction Enum JavaScript best practice */
const SelectorDirection = Object.freeze({"right":1, "down":2, "left":3, "up":4, "vertical": 5, "horizontal": 6});

function createMyRBush(boxes) {
    const tree = new MyRBush();
    tree.load(boxes);
    return tree;
}

// function findRelations(tree, box, document, direction) {
//     var selector, relations, minX, minY, maxX, maxY, pageWidth, pageHeight;
//     minX = box.left;
//     minY = box.top;
//     maxX = box.right;
//     maxY = box.bottom;
//     pageWidth = document.width;
//     pageHeight = document.height;
//     if(direction == SelectorDirection.right) {
//         selector = {minX:maxX+1, minY:minY+1, maxX:pageWidth, maxY:maxY-1};
//     } else if(direction == SelectorDirection.down) {
//         // selector = {minX:minX+1, minY:0, maxX:maxX-1, maxY:minY-1};
//         selector = {minX:minX+1, minY:minY-1, maxX:maxX-1, maxY: pageHeight};
//     } 
//     // console.log(selector);
//     // else if(direction == SelectorDirection.left) {
//     //     selector = {minX:0, minY:minY+1, maxX:minX-1, maxY:maxY-1};
//     // } else if(direction == SelectorDirection.up) {
//     //     selector = {minX:minX+1, minY:maxY+1, maxX:maxX-1, maxY:pageHeight};
//     // }
//     relations = tree.search(selector);
//     return relations;
// }


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

        if(rel.absoluteDistance > box.maxNeighbourDistance) {
            box.maxNeighbourDistance = rel.absoluteDistance;
        }
    }

    for (let i = 0; i < relations.length; i++) {
        rel = relations[i];
        
        if(rel.absoluteDistance == shortestDistance) {
            directNeighbours.push(rel.boxB);
            globals.allRelations.push(rel);
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


    console.log(box.id);
    console.log(directNeighbours.map(x => x.id));
    console.log("\n\n");
}

function process(extracted) {

    /* Create R*-Tree from boxes */
    globals.tree = createMyRBush(extracted.boxes);
    globals.boxes = extracted.boxes;
    globals.pageWidth = extracted.document.width;
    globals.pageHeight = extracted.document.height;

    console.time("findDirectNeighbours");

    for (let i = 0; i < extracted.boxes.length; i++) {
        var box = extracted.boxes[i];
        findDirectNeighbours(box);    
    }

    for (let i = 0; i < globals.allRelations.length; i++) {
        rel = globals.allRelations[i];

        
    }

    console.log("Boxes Count: ", extracted.boxes.length);
    console.log("Relations Count: ", globals.allRelations.length);

    console.timeEnd("findDirectNeighbours");

    // console.log(globals.allRelations.length);

    // box = globals.boxes[0];
    // findDirectNeighbours(box);

   



}




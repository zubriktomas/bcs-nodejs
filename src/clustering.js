const RBush = require('rbush');

module.exports.process = process;

// class RBushBox {
//     constructor(minX, minY, maxX, maxY, id) {
//         this.minX = minX;
//         this.minY = minY;
//         this.maxX = maxX;
//         this.maxY = maxY;
//         this.id = id;
//     }

//     static fromBox(box) {
//         return new RBushBox(box.left, box.bottom, box.right, box.top, box.id);
//     }
// }

class BoxRelation {
    constructor(boxA, boxB) {
        this.boxA = boxA;
        this.boxB = boxB;
        this.similarity = null;
        this.alignmentScore = null;
        this.absoluteDistance = null;
        this.direction = null;
        this.cardinality = null;
    }

    direction(value) {
        this.direction = value;
    }
}

class MyRBush extends RBush {
    toBBox(box) { return {minX: box.left, minY: box.bottom, maxX: box.right, maxY: box.top, id:box.id}; }
    compareMinX(a, b) { return a.left - b.left; }
    compareMinY(a, b) { return a.bottom - b.bottom; }
}

// Selector Direction Enum JavaScript best practice
// const SelectorDirection = Object.freeze({"right":1, "down":2, "left":3, "up":4});
const SelectorDirection = Object.freeze({"vertical": 1, "horizontal": 2});

function convertBoxes(boxes) {
    var items = [], box;
    for (let i = 0; i < boxes.length; i++) {
        items.push(RBushBox.fromBox(boxes[i]));
    }
    return items;
}

function createTree(items) {
    const tree = new RBush();
    tree.load(items);
    return tree;
}

function createMyRBush(boxes) {
    const tree = new MyRBush();
    tree.load(boxes);
    return tree;
}


// function findNeighbours(tree, item, document, direction) {

//     var selector, neighbours, minX, minY, maxX, maxY, pageWidth, pageHeight;

//     minX = item.minX;
//     minY = item.minY;
//     maxX = item.maxX;
//     maxY = item.maxY;
//     pageWidth = document.width;
//     pageHeight = document.height;

//     if(direction == SelectorDirection.right) {
//         selector = new RBushBox(maxX+1, minY+1, pageWidth, maxY-1);
//     } else if(direction == SelectorDirection.down) {
//         selector = new RBushBox(minX+1, 0, maxX-1, minY-1);
//     } else if(direction == SelectorDirection.left) {
//         selector = new RBushBox(0, minY+1, minX-1, maxY-1);
//     } else if(direction == SelectorDirection.up) {
//         selector = new RBushBox(minX+1, maxY+1, maxX-1, pageHeight);
//     }

//     neighbours = tree.search(selector);

//     return neighbours;
// }

// public int getDistanceAbsolute(PageArea a)
//     {
//         if (this == a || this.overlaps(a)) return 0;

//         if (this.left > a.right || a.left > this.right)
//         {
//             return Math.min(Math.abs(this.left-a.right), Math.abs(a.left-this.right));
//         }
//         else
//         {
//             return Math.min(Math.abs(this.top-a.bottom), Math.abs(a.top-this.bottom));
//             //  if (this.top > a.bottom || a.top > this.bottom)
//             // -> this condition is now implicit
//         }
//     }

// function getAbsoluteDistance(a, b) {
//     if(a.)
// }



// function getItemsWithNeighbours(tree, items, document) {

//     var itemsWithNeighbours = [];

//     items.forEach(item => {
//         itemsWithNeighbours.push({
//             item:item, 
//             rightNeighbours: findNeighbours(tree, item, document, SelectorDirection.right),
//             downNeighbours: findNeighbours(tree, item, document, SelectorDirection.down),
//             leftNeighbours: findNeighbours(tree, item, document, SelectorDirection.left),
//             upNeighbours: findNeighbours(tree, item, document, SelectorDirection.up)
//         });
//     });

//     console.log(itemsWithNeighbours);

// }

function findNeighbours(tree, box, document, direction) {

    var selector, neighbours, minX, minY, maxX, maxY, pageWidth, pageHeight;

    minX = box.left;
    minY = box.bottom;
    maxX = box.right;
    maxY = box.top;
    pageWidth = document.width;
    pageHeight = document.height;

    if(direction == SelectorDirection.right) {
        selector = {minX:maxX+1, minY:minY+1, maxX:pageWidth, maxY:maxY-1};
    } else if(direction == SelectorDirection.down) {
        selector = {minX:minX+1, minY:0, maxX:maxX-1, maxY:minY-1};
    } else if(direction == SelectorDirection.left) {
        selector = {minX:0, minY:minY+1, maxX:minX-1, maxY:maxY-1};
    } else if(direction == SelectorDirection.up) {
        selector = {minX:minX+1, minY:maxY+1, maxX:maxX-1, maxY:pageHeight};
    }

    neighbours = tree.search(selector);

    return neighbours;
}




function getBoxRelations(tree, boxes, document) {
    var box, neighbours, relations = [];
    for (let i = 0; i < boxes.length; i++) {
        box = boxes[i];

        // console.log("Right Neighbours");
        neighbours = findNeighbours(tree, box, document, SelectorDirection.right);

        for (let j = 0; j < neighbours.length; j++) {
            neighbour = neighbours[j];
            relations.push(new BoxRelation(box, neighbour));
        }

        // console.log("Down Neighbours");
        neighbours = findNeighbours(tree, box, document, SelectorDirection.down);

        for (let j = 0; j < neighbours.length; j++) {
            neighbour = neighbours[j];
            relation = new BoxRelation(box, neighbour, SelectorDirection.down);
            relation.direction();
            relations.push();
        }

        // console.log("Left Neighbours");
        // neighbours = findNeighbours(tree, box, document, SelectorDirection.left);

        // console.log("Up Neighbours");
        // neighbours = findNeighbours(tree, box, document, SelectorDirection.up);
    }

    return relations;
}

function process(extracted) {
    // var items = convertBoxes(extracted.boxes);
    // const tree = createTree(items);

    var boxes = extracted.boxes;
    var document = extracted.document;
    const tree = createMyRBush(boxes);

    // console.log(tree);

    // getItemsWithNeighbours(tree, items, extracted.document);

    var relations = getBoxRelations(tree, boxes, document);

    console.log("\nNumber of relations: ", relations.length, "\n");
    console.log(relations[0]);


}




const { EntityType } = require("./EntityType");
const Relation = require("./Relation");
const { Selector, SelectorDirection } = require("./Selector");

class Box {
    constructor(box) {
      this.left = box.left;
      this.right = box.right;
      this.top = box.top;
      this.bottom = box.bottom;
      this.width = box.width;
      this.height = box.height;
      this.color = box.color;
      this.id = box.id;

      this.type = EntityType.box;
      this.maxNeighbourDistance = 0;
      this.neighbours = new Map(); // cannot serialize from browser context, must reinitialize in Node.js!
      this.cluster = null;
    }

    findDirectNeighbours(cm, direction) {
        var tree = cm.tree;
        var box = this;
    
        var selector, neighbours = [];
    
        const pageWidth = cm.pageDims.width;
        const pageHeight = cm.pageDims.height;
    
        const selectorWidth = 100;
        const selectorHeight = 50;
    
        if(direction == SelectorDirection.right){
    
            for (let maxX = box.right + selectorWidth; maxX < pageWidth + selectorWidth; maxX+=selectorWidth) {
    
                selector = new Selector(box.right, box.top, maxX, box.bottom);
                neighbours = tree.search(selector.narrowBy1Px());
    
                if(neighbours.length) {
                    break;
                }
            }
        } else if (direction == SelectorDirection.down) {
            for (let maxY = box.bottom + selectorHeight; maxY < pageHeight + selectorHeight; maxY+=selectorHeight) {
    
                selector = new Selector(box.left, box.bottom, box.right, maxY);
                neighbours = tree.search(selector.narrowBy1Px());
    
                if(neighbours.length) {
                    break;
                }
            }
        } else if (direction == SelectorDirection.left) {
            for (let minX = box.left - selectorWidth; minX > 0 - selectorWidth; minX-=selectorWidth) {
    
                selector = new Selector(minX, box.top, box.left, box.bottom);
                neighbours = tree.search(selector.narrowBy1Px());
    
                if(neighbours.length) {
                    break;
                }
            }
        } else if (direction == SelectorDirection.up) {
            for (let minY = box.top - selectorHeight; minY > 0 - selectorHeight; minY-=selectorHeight) {
    
                selector = new Selector(box.left, minY, box.right, box.top);
                neighbours = tree.search(selector.narrowBy1Px());
    
                if(neighbours.length) {
                    break;
                }
            }
        }
    
        var tmpRelations = [], shortestDistance = Number.MAX_SAFE_INTEGER;
    
        for (const neighbour of neighbours) {
            var rel = new Relation(box, neighbour, direction);
            tmpRelations.push(rel);
            if(rel.absoluteDistance < shortestDistance) {
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
}

module.exports = Box;
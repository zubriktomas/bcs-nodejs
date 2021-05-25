 /**
 * Project: Box Clustering Segmentation in Node.js
 * Author: Tomas Zubrik, xzubri00@stud.fit.vutbr.cz
 * Year: 2021
 * Description: Box Structure used in clustering
 */

const { EntityType } = require("./EntityType");
const Relation = require("./Relation");
const { Selector, SelectorDirection } = require("./Selector");

/**
 * Box Structure used in clustering
 */
class Box {
    /**
     * Create Box from BoxInfo 
     * @param {BoxInfo} box 
     */
    constructor(box) {
      
        /* Box basic info */
      this.left = box.left;
      this.right = box.right;
      this.top = box.top;
      this.bottom = box.bottom;
      this.width = box.width;
      this.height = box.height;
      this.color = box.color;
      this.id = box.id;

      /* Box clustering info */
      this.type = EntityType.box;
      this.maxNeighbourDistance = 0;
      this.neighbours = new Map();
      this.cluster = null;
    }

    /**
     * Find all direct neighbours of (this) box 
     * @param {ClusteringManager} cm 
     * @param {SelectorDirection} direction 
     */
    findDirectNeighbours(cm, direction) {

        /* Get RTree from Clustering Manager to search for direct neighbours */
        var tree = cm.tree;
        var box = this;
    
        var selector, neighbours = [];
    
        /* Important for stop searching for neighbours in given direction */
        const pageWidth = cm.pageDims.width;
        const pageHeight = cm.pageDims.height;
    
        /* Selector initial width and height - set experimentally, higher values means lower count of queries into rtree,
         * but get more boxes to loop over in temporary relations calculations */
        const selectorWidth = 100;
        const selectorHeight = 50;
    
        /* Find nearest boxes in right direction */
        if(direction == SelectorDirection.right){
            for (let maxX = box.right + selectorWidth; maxX < pageWidth + selectorWidth; maxX+=selectorWidth) {
    
                /* Selector is dynamically enlarged until pageWidth, to truly find all direct neighbours */
                selector = new Selector(box.right, box.top, maxX, box.bottom);

                /* Selector is narrowed by 1 px to find true overlaps */
                neighbours = tree.search(selector.narrowBy1Px());
    
                /* If have been found some boxes in right direction, get all direct neighbours from them */
                if(neighbours.length) {
                    break;
                }

                /* The same stands for all directions */
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
    
        /* Loop over all 'neighbours', resp. all boxes in specified direction found by Selector */
        for (const neighbour of neighbours) {
            var rel = new Relation(box, neighbour, direction, cm.argv);
            tmpRelations.push(rel);

            /* Determine shortest absolute distance in that direction, to truly find direct neighbours */
            if(rel.absoluteDistance < shortestDistance) {
                shortestDistance = rel.absoluteDistance;
            }
        }
    
        for (const rel of tmpRelations) {

            /* If is relation describes direct neighbour relation in some direction */
            if(rel.absoluteDistance == shortestDistance) {
    
                /* If such relation does not exist yet, add it do relations */
                if(!cm.relations.has(rel.id)) {
                    cm.relations.set(rel.id, rel);
                }
                /* If relation between boxes already exists, assign reference to if from relations set */
                box.neighbours.set(rel.entityB, cm.relations.get(rel.id));
    
                if(rel.absoluteDistance > box.maxNeighbourDistance) {
                    box.maxNeighbourDistance = rel.absoluteDistance;
                }
            }
        }
      }

    /**
     * Check if box contains box visually
     * @param {Box} box 
     * @returns true|false
     */
    containsVisually(box) {

        /* Check if top left corner is inside box */
        var topLeftInside = this.top <= box.top && this.left <= box.left;

        /* Check if bottom right corner is inside box */
        var bottomRightInside = this.bottom >= box.bottom && this.right >= box.right;

        return topLeftInside && bottomRightInside;
    }
}

module.exports = Box;
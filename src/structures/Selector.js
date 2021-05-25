 /**
 * Project: Box Clustering Segmentation in Node.js
 * Author: Tomas Zubrik, xzubri00@stud.fit.vutbr.cz
 * Year: 2021
 * Description: Selector Structure for searching in RTree
 */

/* Enum Selector Direction  */
const SelectorDirection = Object.freeze({
    right: 'right',
    down: 'down',
    left: 'left',
    up: 'up',
    other: 'other'
});

/**
 * Selector Structure for searching in RTree
 */
class Selector {

    /* Create selector specified by coordinates */
    constructor(minX, minY, maxX, maxY) {
        this.minX = minX;
        this.minY = minY;
        this.maxX = maxX;
        this.maxY = maxY;
    }

    /**
     * Create selector from given entity (its coordinates)
     * @param {(Cluster|Box)} entity 
     * @returns Selector
     */
    static fromEntity(entity) {
        return new Selector(entity.left, entity.top, entity.right, entity.bottom);
    }

    /**
     * Narrow selector from every side to find TRUE overlaps
     * @returns Selector narrowed by 1px
     */
    narrowBy1Px() {
        this.minX += 1;
        this.minY += 1;
        this.maxX -= 1;
        this.maxY -= 1;
        return this;
    }
}

module.exports = {Selector, SelectorDirection};
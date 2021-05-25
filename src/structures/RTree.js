 /**
 * Project: Box Clustering Segmentation in Node.js
 * Author: Tomas Zubrik, xzubri00@stud.fit.vutbr.cz
 * Year: 2021
 * Description: RTree Structure adapted for Cluster and Box Structures
 */

const RBush = require('rbush');

/**
 * RTree Structure adapted for Cluster and Box Structures
 */
class RTree extends RBush {

    /**
     * Create BBox structure to load entity to RBush
     * @param {(Cluster|Box)} entity 
     * @returns RBush structure for working with tree
     */
    toBBox(entity) {
        return {
            minX: entity.left,
            minY: entity.top,
            maxX: entity.right,
            maxY: entity.bottom,
            id: entity.id,
            type: entity.type
        };
    }
    
    /* Compare functions basically specifies the beginning of coordinate system (top,left)=(0,0) */
    compareMinX(a, b) {
        return a.left - b.left;
    }

    compareMinY(a, b) {
        return a.top - b.top;
    }
}

module.exports = RTree;
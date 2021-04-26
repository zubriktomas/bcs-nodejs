 /**
 * Project: Box Clustering Segmentation in Node.js
 * Author: Tomas Zubrik, xzubri00@stud.fit.vutbr.cz
 * Year: 2021
 * License:  GNU GPLv3
 * Description: Functions useful for process of node extraction.
 */


const RBush = require('rbush');

class RTree extends RBush {

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

    compareMinX(a, b) {
        return a.left - b.left;
    }

    compareMinY(a, b) {
        return a.top - b.top;
    }
}

module.exports = RTree;
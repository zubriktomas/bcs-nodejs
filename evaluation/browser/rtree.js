/**
 * Author: Tomas Zubrik, xzubri00@stud.fit.vutbr.cz
 * Date: 2021-05-01
 * 
 */

/**
 * RTree for indexing segmentations in browser context
 * (duplicated and adapted code from /src/structures/RTree.js)
 */
class RTree extends RBush {
    toBBox(entity) {
        return {
            minX: entity.left,
            minY: entity.top,
            maxX: entity.right,
            maxY: entity.bottom,
            type: entity.type
        };
    }

    compareMinX(a, b) {
        return a.left - b.left;
    }

    compareMinY(a, b) {
        return a.top - b.top;
    }

    /* Create baseline segmentation with single segment (whole page) given by all RTree data */
    getBaselineWholePageSegment() {
        var segment = {};
        segment.top = this.data.minY < 0 ? 0 : this.data.minY;
        segment.left = this.data.minX < 0 ? 0 : this.data.minX;
        segment.bottom = this.data.maxY;
        segment.right = this.data.maxX;
        segment.width = segment.right - segment.left;
        segment.height = segment.bottom - segment.top;
        segment.type = 1;
        segment.segm = "baseline";
        return segment;
    }    
}
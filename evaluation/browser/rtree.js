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

    getBaselineWholePageSegment() {
        var segment = {};
        segment.top = this.data.minY;
        segment.left = this.data.minX;
        segment.bottom = this.data.maxY;
        segment.right = this.data.maxX;
        segment.width = segment.right - segment.left;
        segment.height = segment.bottom - segment.top;
        segment.type = 1;
        segment.impl = "baseline";
        return segment;
    }    
}
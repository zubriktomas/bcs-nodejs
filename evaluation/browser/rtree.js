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
}
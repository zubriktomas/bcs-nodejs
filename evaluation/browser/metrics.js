
class Selector {
    constructor(minX, minY, maxX, maxY) {
        this.minX = minX;
        this.minY = minY;
        this.maxX = maxX;
        this.maxY = maxY;
    }

    static fromEntity(entity) {
        return new Selector(entity.left, entity.top, entity.right, entity.bottom);
    }

    narrowBy1Px() {
        this.minX += 1;
        this.minY += 1;
        this.maxX -= 1;
        this.maxY -= 1;
        return this;
    }
}

function getAllBoxesThatAreInSomeCluster(impl) {

    var clusters;

    if(impl) {
        clusters = window.tree.all().filter(e => e.type == 1 && e.impl == impl);    
    } else {
        clusters = window.tree.all().filter(e => e.type == 1 && !(e.impl));
    }

    var boxes = [];
    for (const cluster of clusters) {
        var boxesInCluster = window.tree.search(Selector.fromEntity(cluster).narrowBy1Px()).filter(e => e.type == 0);
        boxes = boxes.concat(boxesInCluster);
    }
    return new Set(boxes);
}

function getBoxesInSameCluster(rtree, box) {
    var cluster = rtree.search(Selector.fromEntity(box).narrowBy1Px()).filter(e => e.type == 1)[0];
    var boxes = rtree.search(Selector.fromEntity(cluster).narrowBy1Px()).filter(e => e.type == 0 && e != box);
    return boxes;
}



function calcPrecision(clusters1, clusters2) {
    var boxesInCluster = getBoxesWithCluster(rtree, boxes, clusters1);
    var oneDividedByES = 1 / boxesInCluster.length;

    var sum1 = 0, sum2 = 0;
    for (const b of boxesInCluster) {

        var boxesInSameCluster = getBoxesInSameCluster(rtree, b);
        var oneDividedByESe = 1 / boxesInSameCluster.length;

        for (const b_ of boxesInSameCluster) {
            sum2 += (Math.min(Sb))
        }
    }
}

function calcRecall(clusters1, clusters2) {
    return calcPrecision(clusters2, clusters1);
}

function calcFScore(clusters1, clusters2) {
    var precision, recall, result;
    precision = calcPrecision(clusters1, clusters2);
    recall = calcRecall(clusters1, clusters2);
    result = (2 * precision * recall) / (precision + recall);

}
// import { intersection } from "./set-operations";

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

/** E^S */
function getAllBoxesThatAreInSomeCluster(impl) {

    var implSegments = window.tree.all().filter(e => e.type == 1 && e.impl == impl);    

    var boxes = [];
    for (const segment of implSegments) {
        var boxesInCluster = window.tree.search(Selector.fromEntity(segment).narrowBy1Px()).filter(e => e.type == 0);
        boxes = boxes.concat(boxesInCluster);
    }
    return new Set(boxes);
}

/** E^S_e */
function getAllBoxesInClusterThatHasBox_e(impl, box) {
    var clusterOfBox = window.tree.search(Selector.fromEntity(box).narrowBy1Px()).filter(e => e.type == 1 && e.impl == impl)[0];
    var boxCompanions = window.tree.search(Selector.fromEntity(clusterOfBox).narrowBy1Px()).filter(e => e.type == 0 && e != box);
    return new Set(boxCompanions);
}

function getAllClustersContainingBox(impl, box) {
    var clustersContainingBox = window.tree.search(Selector.fromEntity(box).narrowBy1Px()).filter(e => e.type == 1 && e.impl == impl);
    return new Set(clustersContainingBox);
}


/* impl1 == some segmentation, impl2 == ground truth segmentation */
function calcPrecision(impl1, impl2) {
    
    var ES = getAllBoxesThatAreInSomeCluster(impl1);

    var sumES = 0.0, sumESe = 0.0;

    for (const e of ES) {

        var ESe = getAllBoxesInClusterThatHasBox_e(impl1, e);

        for (const e_ of ESe) {
            var Se = getAllClustersContainingBox(impl1, e);
            var Se_ = getAllClustersContainingBox(impl1, e_);

            var SeStar = getAllClustersContainingBox(impl2, e);
            var Se_Star = getAllClustersContainingBox(impl2, e_);

            var SeIntersectionSe_Size = intersection(Se, Se_).size;
            var SeStarIntersectionSe_StarSize = intersection(SeStar, Se_Star).size;

            sumESe += (Math.min(SeIntersectionSe_Size, SeStarIntersectionSe_StarSize) / SeIntersectionSe_Size);
        }

        sumES += (sumESe / ESe.size);
        sumESe = 0.0;    
    }

    var result = sumES / ES.size;

    return result;
}

function calcRecall(impl1, impl2) {
    return calcPrecision(impl2, impl1);
}

function calcMetricsBetweenSegmentations(impl1, impl2) {
    var precision, recall, fscore, metrics = {};
    precision = calcPrecision(impl1, impl2);
    recall = calcRecall(impl1, impl2);
    fscore = (2 * precision * recall) / (precision + recall);

    metrics.precision = precision;
    metrics.recall = recall;
    metrics.fscore = fscore;

    return metrics;
}

function calcMetricsWithGroundTruth(impl) {
    return calcMetricsBetweenSegmentations(impl, "GT");
}
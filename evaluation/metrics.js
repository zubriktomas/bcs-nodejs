const { Selector } = require("../src/structures/Selector");

var boxes;
var rtree;

/** put all boxes into Rtree */
/** put reference impl clusters into Rtree */
/** put basic impl clusters into Rtree */

/** getBoxes that are in SOME cluster:
 * 
 *  
 *  foreach cluster overlaps boxes in Rtree:
 *          
 * 
 */


function getBoxesWithCluster(rtree, boxes, clusters) {

    var boxesInCluster = [];
    for (const cluster of clusters) {
        var boxesOverlapping = rtree.search(Selector.fromEntity(cluster).narrowBy1Px()).filter(e => e.type == 0);
        boxesInCluster = boxesInCluster.concat(boxesOverlapping);
    }

    return boxesInCluster;
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

    // var boxesInClusterCount = boxesInCluster.length;



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
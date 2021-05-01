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

const Metrics = Object.freeze({ fscore: 'fscore', precision: 'precision', recall: 'recall' });

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


function createMetricsResultsTable() {
    const resultsDiv = document.querySelector("div.results");

    var tableHeaders = ["Metric", "Baseline", "Reference", "Basic"];

    var resultBaseline = calcMetricsWithGroundTruth("baseline");
    var resultReference = calcMetricsWithGroundTruth("reference");
    var resultBasic = calcMetricsWithGroundTruth("basic");

    var allSegments = window.tree.all().filter(e => e.type == 1);

    var nosegments = {
        baseline: allSegments.filter(e => e.impl == "baseline").length,
        reference: allSegments.filter(e => e.impl == "reference").length,
        basic: allSegments.filter(e => e.impl == "basic").length
    };

    var fscore = {
        baseline: resultBaseline.fscore.toFixed(2),
        reference: resultReference.fscore.toFixed(2),
        basic: resultBasic.fscore.toFixed(2)
    };

    var precision = {
        baseline: resultBaseline.precision.toFixed(2),
        reference: resultReference.precision.toFixed(2),
        basic: resultBasic.precision.toFixed(2)
    };

    var recall = {
        baseline: resultBaseline.recall.toFixed(2),
        reference: resultReference.recall.toFixed(2),
        basic: resultBasic.recall.toFixed(2)
    };

    const createTableRow = (metricName, values) => {
        let resultsTableBodyRow = document.createElement('tr');

        var maxFscore; 
        if(metricName == Metrics.fscore) {
            maxFscore = Math.max(values.reference, values.basic);
            resultsTableBodyRow.className = "fscore";
        }
        
        let metric = document.createElement('td');
        metric.innerText = metricName;

        let baseline = document.createElement('td');
        baseline.innerText = values.baseline;

        let reference = document.createElement('td');
        reference.innerText = values.reference;
        reference.className = metricName == Metrics.fscore &&  maxFscore == values.reference ? "bold" : "";

        let basic = document.createElement('td');
        basic.innerText = values.basic;
        basic.className = metricName == Metrics.fscore && maxFscore == values.basic ? "bold" : "";

        resultsTableBodyRow.append(metric, baseline, reference, basic);

        return resultsTableBodyRow;
    };


    const createResultsTable = () => {
        while (resultsDiv.firstChild) resultsDiv.removeChild(resultsDiv.firstChild);

        let resultsTable = document.createElement('table');
        // resultsTable.className = 'resultsTable';

        let resultsTableHead = document.createElement('thead');
        // resultsTableHead.className = 'resultsTableHead';

        let resultsTableHeaderRow = document.createElement('tr');
        // resultsTableHeaderRow.className = 'resultsTableHeaderRow';

        tableHeaders.forEach(header => {
            let resultHeader = document.createElement('th');
            resultHeader.innerText = header;
            resultsTableHeaderRow.append(resultHeader);
        });

        resultsTableHead.append(resultsTableHeaderRow);
        resultsTable.append(resultsTableHead);

        let resultsTableBody = document.createElement('tbody');
        // resultsTableBody.className = 'resultsTableBody';

        resultsTableBody.append(createTableRow("no. segments", nosegments));
        resultsTableBody.append(createTableRow(Metrics.fscore, fscore));
        resultsTableBody.append(createTableRow(Metrics.precision, precision));
        resultsTableBody.append(createTableRow(Metrics.recall, recall));

        resultsTable.append(resultsTableBody);

        resultsDiv.append(resultsTable);

    }

    createResultsTable();

    // const appendResults = (singleResult, singleResultIndex) => {
    //     const scoreboardTable = document.querySelector('.scoreboardTable') // Find the table we created
        

    //     let usernameData = document.createElement('td')
    //     usernameData.innerText = singleResult.user.username
    //     let scoreData = document.createElement('td')
    //     scoreData.innerText = singleResult.score
    //     let timeData = document.createElement('td')
    //     timeData.innerText = singleResult.time_alive
    //     let accuracyData = document.createElement('td')
    //     accuracyData.innerText = singleResult.accuracy
    //     scoreboardTableBodyRow.append(scoreRanking, usernameData, scoreData, timeData, accuracyData) // Append all 5 cells to the table row
    //     scoreboardTable.append(scoreboardTableBodyRow) // Append the current row to the scoreboard table body
    // };
}



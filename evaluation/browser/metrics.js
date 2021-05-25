/**
 * Project: Box Clustering Segmentation in Node.js
 * Author: Tomas Zubrik, xzubri00@stud.fit.vutbr.cz
 * Year: 2021
 * Description: Metrics calculation and results table creation
 */

/**
 * Selector structure used for searching in RTree
 * (duplicated code from /src/structures/Selector for a sake of annotator)
 */
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

/**
 * Get all boxes that are at least in one segment
 * @param {*} segm 
 * @returns Set of boxes inside some segment
 */
function getAllBoxesThatAreInSomeSegment(segm) {

    var implSegments = window.tree.all().filter(e => e.type == 1 && e.segm == segm);

    var boxes = [];
    for (const segment of implSegments) {
        var boxesInCluster = window.tree.search(Selector.fromEntity(segment).narrowBy1Px()).filter(e => e.type == 0);
        boxes = boxes.concat(boxesInCluster);
    }
    return new Set(boxes);
}

/**
 * Get all boxes from segment, that has given box 
 * @param {*} segm 
 * @param {*} box 
 * @returns Set of boxes (companions of given box)
 */
function getAllBoxesInSegmentThatHasBox(segm, box) {
    var clusterOfBox = window.tree.search(Selector.fromEntity(box).narrowBy1Px()).filter(e => e.type == 1 && e.segm == segm)[0];
    var boxCompanions = window.tree.search(Selector.fromEntity(clusterOfBox).narrowBy1Px()).filter(e => e.type == 0 && e != box);
    return new Set(boxCompanions);
}

/**
 * Get all segments from segmentation, that contain given box
 * @param {*} segm 
 * @param {*} box 
 * @returns Set of segments containing the box
 */
function getAllSegmentsContainingBox(segm, box) {
    var clustersContainingBox = window.tree.search(Selector.fromEntity(box).narrowBy1Px()).filter(e => e.type == 1 && e.segm == segm);
    return new Set(clustersContainingBox);
}

/**
 * Calculate precision between two segmentations.
 * (For better understanding of precision calculation between 2 segmentations
 * look into: https://doi.org/10.1145/3340531.3412782
 * @param {*} segm1 
 * @param {*} segm2 
 * @returns 
 */
function calcPrecision(segm1, segm2) {

    var segm1SegmentsBox, segm1SegmentsBox_, segm1IntersectionSize,
        segm2SegmentsBox, segm2SegmentsBox_, segm2IntersectionSize,
        sumOuter = 0.0, sumInner = 0.0,
        boxesInSegment, boxesInSameSegmentAsBox, result;
    
    boxesInSegment = getAllBoxesThatAreInSomeSegment(segm1);

    for (const box of boxesInSegment) {

        boxesInSameSegmentAsBox = getAllBoxesInSegmentThatHasBox(segm1, box);

        for (const box_ of boxesInSameSegmentAsBox) {
            segm1SegmentsBox = getAllSegmentsContainingBox(segm1, box);
            segm1SegmentsBox_ = getAllSegmentsContainingBox(segm1, box_);

            segm2SegmentsBox = getAllSegmentsContainingBox(segm2, box);
            segm2SegmentsBox_ = getAllSegmentsContainingBox(segm2, box_);

            segm1IntersectionSize = intersection(segm1SegmentsBox, segm1SegmentsBox_).size;
            segm2IntersectionSize = intersection(segm2SegmentsBox, segm2SegmentsBox_).size;

            sumInner += segm1IntersectionSize ? (Math.min(segm1IntersectionSize, segm2IntersectionSize) / segm1IntersectionSize) : 0;
        }

        sumOuter += boxesInSameSegmentAsBox.size ? (sumInner / boxesInSameSegmentAsBox.size) : 0;
        sumInner = 0.0;
    }

    result = boxesInSegment.size ? sumOuter / boxesInSegment.size : 0;

    return result;
}

/**
 * Calculate recall between two segmentations
 * @param {*} segm1 
 * @param {*} segm2 
 * @returns 
 */
function calcRecall(segm1, segm2) {
    return calcPrecision(segm2, segm1);
}

/**
 * Calculate metrics between two segmentations
 * @param {*} segm1 
 * @param {*} segm2 
 * @returns metrics
 */
function calcMetricsBetweenSegmentations(segm1, segm2) {
    var precision, recall, fscore, metrics = {};
    precision = calcPrecision(segm1, segm2);
    recall = calcRecall(segm1, segm2);
    fscore = (2 * precision * recall) / (precision + recall);

    metrics.precision = precision;
    metrics.recall = recall;
    metrics.fscore = fscore;

    return metrics;
}

/**
 * Calculate metrics between segmentation and ground truth
 * @param {*} segm Specific segmentation type
 * @returns Metrics as object
 */
function calcMetricsWithGroundTruth(segm) {
    return calcMetricsBetweenSegmentations(segm, Segmentation.segmentationGT);
}

/**
 * Create results table with metrics
 */
function createMetricsResultsTable(segmentationFilenames) {
    const resultsDiv = document.querySelector("div.results");

    var tableHeaders = ["Segmentation", "No.Segments", "fscore", "precision", "recall"];

    var resultBaseline = calcMetricsWithGroundTruth(Segmentation.baseline);
    var resultSegmentation1 = calcMetricsWithGroundTruth(Segmentation.segmentation1);
    var resultSegmentation2 = calcMetricsWithGroundTruth(Segmentation.segmentation2);
    var resultSegmentation3 = calcMetricsWithGroundTruth(Segmentation.segmentation3);

    /* Get all segments from tree */
    const allSegments = window.tree.all().filter(e => e.type == 1);

    /* Get number of segments by segmentation order */
    const getNoSegmentsBySegmentation = (segm) => allSegments.filter(e => e.segm == segm).length;

    /* Assign number of segments per segmentation */
    resultBaseline.nosegments = getNoSegmentsBySegmentation(Segmentation.baseline);
    resultSegmentation1.nosegments = getNoSegmentsBySegmentation(Segmentation.segmentation1);
    resultSegmentation2.nosegments = getNoSegmentsBySegmentation(Segmentation.segmentation2);
    resultSegmentation3.nosegments = getNoSegmentsBySegmentation(Segmentation.segmentation3);

    /* Assign filenames */
    resultBaseline.filename = '(baseline)';
    resultSegmentation1.filename = segmentationFilenames.segmentation1; 
    resultSegmentation2.filename = segmentationFilenames.segmentation2;
    resultSegmentation3.filename = segmentationFilenames.segmentation3;

    /**
     * Create table row with calculated metrics values
     * @returns HTML <tr> element containing results
     */
    const createTableRow = (segmentationResult) => {
        let resultsTableBodyRow = document.createElement('tr');

        let filename = document.createElement('td');
        filename.innerText = segmentationResult.filename;

        let nosegments = document.createElement('td');
        nosegments.innerText = segmentationResult.nosegments;

        let fscore  = document.createElement('td');
        fscore.innerText = segmentationResult.fscore.toFixed(3);

        let precision  = document.createElement('td');
        precision.innerText = segmentationResult.precision.toFixed(3);

        let recall  = document.createElement('td');
        recall.innerText = segmentationResult.recall.toFixed(3);

        resultsTableBodyRow.append(filename, nosegments, fscore, precision, recall);

        return resultsTableBodyRow;
    };

    /**
     * Create results table with metrics
     */
    const createResultsTable = () => {
        while (resultsDiv.firstChild) resultsDiv.removeChild(resultsDiv.firstChild);

        let resultsTable = document.createElement('table');
        let resultsTableHead = document.createElement('thead');
        let resultsTableHeaderRow = document.createElement('tr');

        /* Get number of ground truth segments */
        var noGTSegments = document.querySelectorAll('.resize-drag').length;

        /* Create table header */
        tableHeaders.forEach(header => {
            let resultHeader = document.createElement('th');
            resultHeader.innerText = header == 'No.Segments' ? `${header} (${noGTSegments})` : header;
            resultsTableHeaderRow.append(resultHeader);
        });
        resultsTableHead.append(resultsTableHeaderRow);
        resultsTable.append(resultsTableHead);

        /* Create table body */
        let resultsTableBody = document.createElement('tbody');

        /* Create data rows */
        resultsTableBody.append(createTableRow(resultBaseline, Segmentation.baseline));
        if(!isNaN(resultSegmentation1.fscore)) resultsTableBody.append(createTableRow(resultSegmentation1));
        if(!isNaN(resultSegmentation2.fscore)) resultsTableBody.append(createTableRow(resultSegmentation2));
        if(!isNaN(resultSegmentation3.fscore)) resultsTableBody.append(createTableRow(resultSegmentation3));

        resultsTable.append(resultsTableBody);
        resultsDiv.append(resultsTable);
    }

    createResultsTable();
}
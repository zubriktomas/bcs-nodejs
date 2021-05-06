/**
 * Author: Tomas Zubrik, xzubri00@stud.fit.vutbr.cz
 * Date: 2021-05-01
 * 
 */

/**
 * Enum for selected metrics
 */
 const Metrics = Object.freeze({ 
     fscore: 'fscore', 
     precision: 'precision', 
     recall: 'recall' 
});


/**
 * Enum for segmentation according to implementation
 */
// var Segmentation = Object.freeze({
//     reference: 'reference', // FitLayout puppeteer segmentation
//     basic: 'basic',
//     extended: 'extended',
//     baseline: 'baseline', // abstract segmentation (one segment)
//     GT: "GT" // ground truth segmentation
// });

var Segmentation = Object.freeze({
    segmentation1: 'segmentation1', // FitLayout puppeteer segmentation
    segmentation2: 'segmentation2',
    segmentation3: 'segmentation3',
    segmentationGT: "segmentationGT", // ground truth segmentation
    baseline: 'baseline'// abstract segmentation (one segment)
});

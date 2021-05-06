/**
 * Author: Tomas Zubrik, xzubri00@stud.fit.vutbr.cz
 * Date: 2021-05-01
 * 
 */

const { readFileSync, writeFileSync } = require('fs');
const parser = require('xml2json');
const { tryToLoadFile, FileType } = require('../src/modules/exporter');

/**
 * Convert area structure to segment structure used in GT annotator
 * @param {*} area 
 * @returns segment
 */
function convertAreaToSegment(area) {
    var segment = {};
    segment.left = Number(area.x1);
    segment.top = Number(area.y1);
    segment.right = Number(area.x2);
    segment.bottom = Number(area.y2);
    segment.width = segment.right - segment.left;
    segment.height = segment.bottom - segment.top;
    segment.type = 1;
    // segment.segm = 'reference';
    return segment;
}

/**
 * Parse areaTree XML structure from FitLayout to JSON 
 * (! attention ! Have to specify path to segments.xml on you own)
 */
function areaTreeParse(inFile, outFile) {

    // const xmlData = readFileSync(inFile).toString();
    const xmlData = tryToLoadFile(inFile, FileType.xml);
    const json = JSON.parse(parser.toJson(xmlData));
    const areaList = json.areaTree.area.area;
    var segments = [];
    for (const area of areaList) {
        var segment = convertAreaToSegment(area);
        segments.push(segment);
    }
    var segmentsJson = JSON.stringify(segments);

    if(outFile) {
        writeFileSync(outFile, segmentsJson, (err) => {
            if (err) throw err;
        });
    }
    return segmentsJson;
}

module.exports = { areaTreeParse };
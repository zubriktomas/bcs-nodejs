const { readFileSync, writeFileSync } = require('fs');
const parser = require('xml2json');
const { EntityType } = require('../src/structures/EntityType');

var inFile = './../../../fitlayout-jar/out/segments.xml';
var outFile = './input/segments-ref.json';

function convertAreaToCluster(area) {
    var cluster = {};
    cluster.left = Number(area.x1);
    cluster.top = Number(area.y1);
    cluster.right = Number(area.x2);
    cluster.bottom = Number(area.y2);
    cluster.width = cluster.right - cluster.left;
    cluster.height = cluster.bottom - cluster.top;
    cluster.type = EntityType.cluster;
    cluster.impl = 'reference';
    return cluster;
}

function areaTreeParse() {

    const xmlData = readFileSync(inFile).toString();
    const json = JSON.parse(parser.toJson(xmlData));
    const areaClusters = json.areaTree.area.area;
    var clusters = [];
    for (const area of areaClusters) {
        var cluster = convertAreaToCluster(area);
        clusters.push(cluster);
    }
    var clustersJson = JSON.stringify(clusters);
    writeFileSync(outFile, clustersJson, (err) => {
        if (err) throw err;
    });
}

module.exports.areaTreeParse = areaTreeParse;
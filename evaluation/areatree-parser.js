fs = require('fs');
var parser = require('xml2json');

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
    return cluster;
}

fs.readFile(inFile, function (err, data) {
    if (err) throw err;

    /* Convert XML to JSON */
    const json = JSON.parse(parser.toJson(data));

    /* Top level areaTree -> whole page area containing all areas -> list of leaf areas as clusters */
    const areaClusters = json.areaTree.area.area;

    var clusters = [];
    for (const area of areaClusters) {
        var cluster = convertAreaToCluster(area);
        clusters.push(cluster);
    }

    var clustersJson = JSON.stringify(clusters);

    fs.writeFile(outFile, clustersJson, (err) => {
        if (err) throw err;
    });
});

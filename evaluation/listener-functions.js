function selectFunctionByCodeKey(event) {
    switch (event.code) {
        case "Enter":
            writeEnterPressed();
            break;

        case "KeyA":
            addGroundTruthCluster();
            break;

        case "KeyS":
            switchBackgroundImage();
            break;

        case "KeyD":
        case "Delete":
            deleteGroundTruthCluster();
            break;

        case "KeyE":
            exportGroundTruthClusterToJsonFile();
            break;

        default:
            break;
    }

}

function writeEnterPressed() {
    console.log("[browser] enter was pressed");
}

function addGroundTruthCluster() {
    let div = document.createElement('div');
    div.className = 'resize-drag';
    div.id = `div${index}`;
    div.tabIndex = "0";

    document.body.appendChild(div);
    window.index++;
}

function switchBackgroundImage() {
    var bgScreenshot = document.getElementById('backgroundScreenshot');

    if (bgScreenshot.classList.contains("backgroundA")) {
        bgScreenshot.classList.remove("backgroundA");
        bgScreenshot.classList.add("backgroundB");
    } else {
        bgScreenshot.classList.remove("backgroundB");
        bgScreenshot.classList.add("backgroundA");
    }
}

function deleteGroundTruthCluster() {
    if (document.hasFocus()) {
        var element = document.activeElement;
        if (element.id.startsWith("div")) {
            element.remove();
        }
    }
}

function exportGroundTruthClusterToJsonFile() {

    var clusters = [];
    var divElements = document.querySelectorAll(".resize-drag");

    const convertToCluster = (divElement) => {
        var cluster = {};
        cluster.top = Number(divElement.dataset.x);
        cluster.left = Number(divElement.dataset.y);
        cluster.width = divElement.offsetWidth;
        cluster.height = divElement.offsetHeight;
        cluster.right = cluster.left + cluster.width;
        cluster.bottom = cluster.top + cluster.height;
        return cluster;
    }

    for (const divElement of divElements) {
        clusters.push(convertToCluster(divElement));
    }
    
    const downloadJsonFile = jsonData => {
        // Creating a blob object from non-blob data using the Blob constructor
        const blob = new Blob([JSON.stringify(jsonData)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        // Create a new anchor element
        const a = document.createElement('a');
        a.href = url;
        a.id = "download";
        a.download = 'download';
        a.click();
        a.remove();
    }

    downloadJsonFile(clusters);
}
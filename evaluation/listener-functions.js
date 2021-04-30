/* Classes for clusters according to implementation */
var ImplementationType = Object.freeze({
    ref: 'referenceImplCluster',
    basic: 'basicImplCluster',
    extended: 'extendedImplCluster'
});

/**
 * Select right function by Code Key
 *  
 * */ 
function selectFunctionByCodeKey(event, dataClusters) {
    switch (event.code) {

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

        case "Digit1":
            loadReferenceImplSegments(dataClusters.ref);
            break;

        case "Digit2":
            loadBasicImplSegments(dataClusters.basic);
            break;

        case "Digit3":
            loadExtendedImplSegments();
            break;

        case "Escape":
            hideResultsModal();
            break;

        case "KeyR":
            showResultsModal();
            break;

        default:
            break;
    }
}

function addGroundTruthCluster() {
    let div = document.createElement('div');
    div.className = 'resize-drag';
    div.id = `div${window.index}`;
    div.tabIndex = "0";
    div.style.top = `${window.mouseY}px`;
    div.style.left = `${window.mouseX}px`;
    document.body.appendChild(div);
    window.index++;
}

function switchBackgroundImage() {
    if (document.body.style.backgroundImage == window.bgA) {
        document.body.style.backgroundImage = window.bgB;
    } else {
        document.body.style.backgroundImage = window.bgA;
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

function loadReferenceImplSegments(referenceImplClusters) {

    console.log(referenceImplClusters);
    var referenceImplDivs = document.querySelectorAll('.' + ImplementationType.ref);

    if (referenceImplDivs.length == 0) {
        for (const cluster of referenceImplClusters) {
            clusterToDiv(cluster, ImplementationType.ref);
        }
    } else {
        for (const div of referenceImplDivs) {
            div.classList.toggle('hiddenDiv');
        }
    }
}

function loadBasicImplSegments(basicImplClusters) {
    var basicImplDivs = document.querySelectorAll('.' + ImplementationType.basic);

    if (basicImplDivs.length == 0) {
        for (const cluster of basicImplClusters) {
            clusterToDiv(cluster, ImplementationType.basic);
        }
    } else {
        for (const div of basicImplDivs) {
            div.classList.toggle('hiddenDiv');
        }
    }

}

function loadExtendedImplSegments() {

}

function clusterToDiv(cluster, clusterImplType) {
    var color;
    switch (clusterImplType) {
        case ImplementationType.ref:
            color = "rgba(128, 0, 0, 0.5)";
            break;

        case ImplementationType.basic:
            color = "rgba(0, 128, 0, 0.5)";
            break;

        case ImplementationType.extended:
            color = "rgba(0, 0, 128, 0.5)";
            break;

        default:
            color = rgba(0, 0, 0, 0.5);
            break;
    }

    let div = document.createElement('div');
    div.style = `
            width: ${cluster.width}px; 
            height: ${cluster.height}px;
            top: ${cluster.top}px;
            left: ${cluster.left}px;
            position: absolute;
            z-index: 99;
            background-color: ${color};
            opacity: 0.5;
        `;

    div.className = clusterImplType;
    document.body.appendChild(div);
}

function hideResultsModal() {
    var modal = document.getElementById("myModal");
    var myModalContent = document.getElementById('myModalContent');

    if (modal.style.display === "block") {
        myModalContent.removeChild(document.getElementById('refParagraph'));
        myModalContent.removeChild(document.getElementById('basicParagraph'));
        modal.style.display = "none";
    }
}

function showResultsModal() {
    var modal = document.getElementById("myModal");
    var myModalContent = document.getElementById('myModalContent');

    if (modal.style.display == "block") {
        hideResultsModal();
        return;
    }

    var refImplText, basicImplText;
    var refClustersLoaded = false, basicClustersLoaded = false;

    var refParagraph = document.createElement('p'),
        basicParagraph = document.createElement('p');

    refParagraph.id = "refParagraph";
    basicParagraph.id = "basicParagraph";

    var referenceImplDivs = document.querySelectorAll('.' + ImplementationType.ref);
    if (referenceImplDivs.length > 0) {
        refClustersLoaded = true;
        refImplText = document.createTextNode("Reference implementation clusters loaded!");
    } else {
        refImplText = document.createTextNode("Reference implementation clusters NOT LOADED YET!");
    }

    var basicImplDivs = document.querySelectorAll('.' + ImplementationType.basic);
    if (basicImplDivs.length > 0) {
        basicClustersLoaded = true;
        basicImplText = document.createTextNode("Basic implementation clusters loaded!");
    } else {
        basicImplText = document.createTextNode("Basic implementation clusters NOT LOADED YET!");
    }

    refParagraph.appendChild(refImplText);
    basicParagraph.appendChild(basicImplText);

    var refPcheck = document.getElementById('refParagraph');
    var basicPcheck = document.getElementById('basicParagraph');

    if (refPcheck == null && basicPcheck == null) {
        myModalContent.appendChild(refParagraph);
        myModalContent.appendChild(basicParagraph);
    }

    modal.style.display = "block";
}
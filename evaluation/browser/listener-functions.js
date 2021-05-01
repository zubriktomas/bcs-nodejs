/* Classes for clusters according to implementation */
var Implementation = Object.freeze({
    reference: 'reference',
    basic: 'basic',
    extended: 'extended'
});

/**
 * Select right function by Code Key
 *  
 * */ 
function selectFunctionByCodeKey(event, segmentations) {
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
            exportGroundTruthSegmentsToJsonFile();
            break;

        case "Digit1":
            loadSegmentationReference(segmentations.reference);
            break;

        case "Digit2":
            loadSegmentationBasic(segmentations.basic);
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

        case "KeyG":
            addGroundTruthSegmentationToRTree();
            break;

        case "KeyC":
            clearAllGroundTruthSegments();
            break;

        default:
            break;
    }
}

function addGroundTruthCluster() {
    let div = document.createElement('div');
    div.className = 'resize-drag';
    div.id = `divGT${window.index}`;
    div.tabIndex = "0";
    div.style.top = `${window.mouseY}px`;
    div.style.left = `${window.mouseX}px`;
    div.dataset.x = 0;
    div.dataset.y = 0;
    div.offsetHeight = 60;
    div.offsetWidth = 60;
    document.body.appendChild(div);
    window.index++;
}

function addGroundTruthSegmentationToRTree() {
    var segmentDivs = document.querySelectorAll('.resize-drag');

    var segmentsGT = [];
    for (const segmentDiv of segmentDivs) {
        segmentsGT.push(convertDivGTToJsonSegment(segmentDiv));
    }

    var gtSegments = window.tree.all().filter(e => e.type == 1 && e.impl == "GT");
    for (const segment of gtSegments) {
        window.tree.remove(segment);
    }

    if(segmentsGT.length){
        window.tree.load(segmentsGT); 
        window.notyf.success("Ground truth segmentation loaded to RTree! Press R to show results.");
    } else {
        window.notyf.error("No ground truth segments added! Previous deleted!");
    }   

    gtSegments = window.tree.all().filter(e => e.type == 1 && e.impl == "GT");
    console.log(gtSegments);
}

function clearAllGroundTruthSegments() {

    var segmentDivs = document.querySelectorAll('.resize-drag');
    for (const segmentDiv of segmentDivs) {
        segmentDiv.remove();
    }

    var gtSegments = window.tree.all().filter(e => e.type == 1 && e.impl == "GT");
    for (const gtSegment of gtSegments) {
        window.tree.remove(gtSegment);
    }
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
        if (element.id.startsWith("divGT")) {
            element.remove();
        }
    }
}

function convertDivGTToJsonSegment(divElement) {
    var cluster = {};
    cluster.top = parseFloat(divElement.style.top) + parseFloat(divElement.dataset.y);
    cluster.left = parseFloat(divElement.style.left) + parseFloat(divElement.dataset.x);
    cluster.width = divElement.offsetWidth;
    cluster.height = divElement.offsetHeight;
    cluster.right = cluster.left + cluster.width;
    cluster.bottom = cluster.top + cluster.height;
    cluster.type = 1;
    cluster.impl = "GT";
    return cluster;
}

function exportGroundTruthSegmentsToJsonFile() {

    var clusters = [];
    var segmentDivs = document.querySelectorAll(".resize-drag");

    for (const segmentDiv of segmentDivs) {
        clusters.push(convertDivGTToJsonSegment(segmentDiv));
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

function loadSegmentationReference(segmentsReference) {

    var divsReference = document.querySelectorAll('.' + Implementation.reference);

    if (divsReference.length == 0) {
        for (const cluster of segmentsReference) {
            clusterToDiv(cluster, Implementation.reference);
        }
        window.notyf.success("Reference segmentation loaded!");
    } else {
        for (const div of divsReference) {
            div.classList.toggle('hiddenDiv');
        }
    }
}

function loadSegmentationBasic(segmentsBasic) {
    var divsBasic = document.querySelectorAll('.' + Implementation.basic);

    if (divsBasic.length == 0) {
        for (const cluster of segmentsBasic) {
            clusterToDiv(cluster, Implementation.basic);
        }
        window.notyf.success("Basic segmentation loaded!");
    } else {
        for (const div of divsBasic) {
            div.classList.toggle('hiddenDiv');
        }
    }

}

function loadExtendedImplSegments() {

}

function clusterToDiv(cluster, clusterImplType) {
    var color;
    switch (clusterImplType) {
        case Implementation.reference:
            color = "rgba(128, 0, 0, 0.5)";
            break;

        case Implementation.basic:
            color = "rgba(0, 128, 0, 0.5)";
            break;

        case Implementation.extended:
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


function calcSegmentationsSimilarity(segments1, segments2) {
    /** TODO */
}

function showResultsModal() {
    var modal = document.getElementById("myModal");
    var myModalContent = document.getElementById('myModalContent');

    if (modal.style.display == "block") {
        hideResultsModal();
        return;
    }

    // if (divsBasic.length > 0 && divsReference.length > 0) {
    //     /** TODO: */
    // }


    var refImplText, basicImplText;
    var refClustersLoaded = false, basicClustersLoaded = false;

    var refParagraph = document.createElement('p'),
        basicParagraph = document.createElement('p');

    refParagraph.id = "refParagraph";
    basicParagraph.id = "basicParagraph";

    var divsReference = document.querySelectorAll('.' + Implementation.reference);
    if (divsReference.length > 0) {
        refClustersLoaded = true;
        refImplText = document.createTextNode("Reference implementation clusters loaded!");
    } else {
        refImplText = document.createTextNode("Reference implementation clusters NOT LOADED YET!");
    }

    var divsBasic = document.querySelectorAll('.' + Implementation.basic);
    if (divsBasic.length > 0) {
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
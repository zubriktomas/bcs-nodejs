/**
 * Author: Tomas Zubrik, xzubri00@stud.fit.vutbr.cz
 * Date: 2021-05-01
 * 
 */

/**
 * Select right listener function given by CodeKey from event
 * @param {*} event Event with information which key was pressed
 * @param {*} segmentations All available segmentations
 */
function selectFunctionByCodeKey(event, segmentations) {
    switch (event.code) {

        case "KeyA":
            addGroundTruthDiv();
            break;

        case "KeyS":
            switchBackgroundImage();
            break;

        case "KeyD":
        case "Delete":
            deleteGroundTruthDiv();
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
            loadExtendedSegmentation();
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

/**
 * Add new ground truth DIV at current mouse position
 */
function addGroundTruthDiv() {
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

/**
 * Insert all created ground truth segments to RTree for metrics calculations
 */
function addGroundTruthSegmentationToRTree() {
    var segmentDivs = document.querySelectorAll('.resize-drag');

    var segmentsGT = [];
    segmentDivs.forEach(segmentDiv => segmentsGT.push(convertDivGTToJsonSegment(segmentDiv)));

    // for (const segmentDiv of segmentDivs) {
    //     segmentsGT.push(convertDivGTToJsonSegment(segmentDiv));
    // }

    var gtSegments = window.tree.all().filter(e => e.type == 1 && e.segm == "GT");

    gtSegments.forEach(segment => window.tree.remove(segment));
    // for (const segment of gtSegments) {
    //     window.tree.remove(segment);
    // }

    if (segmentsGT.length) {
        window.tree.load(segmentsGT);
        /* Calculate all metrics and create results table */
        createMetricsResultsTable();
        window.notyf.success("Ground truth segmentation loaded to RTree! Press R to show results.");
    } else {
        window.notyf.error("No ground truth segments added! Previous deleted!");
    }

    // gtSegments = window.tree.all().filter(e => e.type == 1 && e.segm == "GT");
    // console.log(gtSegments);
}

/**
 * Delete ground truth cluster
 */
function deleteGroundTruthDiv() {
    if (document.hasFocus()) {
        var element = document.activeElement;
        if (element.id.startsWith("divGT")) {
            element.remove();
        }
    }
}

/**
 * Clear (remove all) ground truth segments actually visible on page
 */
function clearAllGroundTruthSegments() {

    var segmentDivs = document.querySelectorAll('.resize-drag');
    for (const segmentDiv of segmentDivs) {
        segmentDiv.remove();
    }

    var gtSegments = window.tree.all().filter(e => e.type == 1 && e.segm == "GT");
    for (const gtSegment of gtSegments) {
        window.tree.remove(gtSegment);
    }
}

/**
 * Convert ground truth DIV to JSON segment representation
 * @param {*} divElement 
 * @returns DIV as JSON GT segment 
 */
function convertDivGTToJsonSegment(divElement) {
    var segment = {};
    segment.top = parseFloat(divElement.style.top) + parseFloat(divElement.dataset.y);
    segment.left = parseFloat(divElement.style.left) + parseFloat(divElement.dataset.x);
    segment.width = divElement.offsetWidth;
    segment.height = divElement.offsetHeight;
    segment.right = segment.left + segment.width;
    segment.bottom = segment.top + segment.height;
    segment.type = 1;
    segment.segm = "GT";
    return segment;
}

/**
 * Export all ground truth segments to local JSON file 
 * (filename is set by Playwright by function saveAs(...) in backend)
 */
function exportGroundTruthSegmentsToJsonFile() {

    var clusters = [];
    var segmentDivs = document.querySelectorAll(".resize-drag");

    segmentDivs.forEach(segmentDiv => clusters.push(convertDivGTToJsonSegment(segmentDiv)));

    // for (const segmentDiv of segmentDivs) {
    //     clusters.push(convertDivGTToJsonSegment(segmentDiv));
    // }

    const downloadJsonFile = jsonData => {
        // Creating a blob object from non-blob data using the Blob constructor
        const blob = new Blob([JSON.stringify(jsonData)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        // Create a new anchor element
        const a = document.createElement('a');
        a.href = url;
        a.id = 'download';
        a.download = 'download';
        a.click();
        a.remove();
    }

    // Initiate download 
    downloadJsonFile(clusters);
}

/**
 * Load ground truth segments from file for given page 
 * (if was extracted before, given by its name)
 * @param {[]} segmentsGT 
 */
function loadSegmentationGroundTruth(segmentsGT) {

    for (const segment of segmentsGT) {
        let div = document.createElement('div');
        div.className = 'resize-drag';
        div.id = `divGT${window.index}`;
        div.tabIndex = "0";
        div.style.top = `${segment.top}px`;
        div.style.left = `${segment.left}px`;
        div.dataset.x = 0;
        div.dataset.y = 0;
        div.style.height = `${segment.height}px`;
        div.style.width = `${segment.width}px`;
        document.body.appendChild(div);
        window.index++;
    }
}

/**
 * Load segments from reference (FitLayout) segmentation/implementation as DIVS
 * @param {[]} segmentsReference 
 */
function loadSegmentationReference(segmentsReference) {

    var divsReference = document.querySelectorAll('.' + Segmentation.reference);

    if (divsReference.length == 0) {
        for (const segment of segmentsReference) {
            convertSegmentToDiv(segment, Segmentation.reference);
        }
        window.notyf.success("Reference segmentation loaded!");
    } else {
        for (const div of divsReference) {
            div.classList.toggle('hiddenDiv');
        }
    }
}

/**
 * Load segments from basic segmentation/implementation as DIVS
 * @param {[]} segmentsBasic 
 */
function loadSegmentationBasic(segmentsBasic) {
    var divsBasic = document.querySelectorAll('.' + Segmentation.basic);

    if (divsBasic.length == 0) {
        for (const segment of segmentsBasic) {
            convertSegmentToDiv(segment, Segmentation.basic);
        }
        window.notyf.success("Basic segmentation loaded!");
    } else {
        for (const div of divsBasic) {
            div.classList.toggle('hiddenDiv');
        }
    }

}

/**
 * Load segments from extended segmentation/implementation as DIVS
 * @param {[]} segmentsExtended
 */
function loadExtendedSegmentation(segmentsExtended) {
    /** TODO */
}

/**
 * Convert segment to div visual representation by segmentation (implementation) type
 * @param {} segment 
 * @param {Segmentation} segmentationImplType 
 */
function convertSegmentToDiv(segment, segmentationImplType) {
    var color;
    switch (segmentationImplType) {
        case Segmentation.reference: color = "rgba(128, 0, 0, 0.5)"; break;
        case Segmentation.basic: color = "rgba(0, 128, 0, 0.5)"; break;
        case Segmentation.extended: color = "rgba(0, 0, 128, 0.5)"; break;
        default: color = rgba(0, 0, 0, 0.5); break;
    }

    /* Create segment as with representative color set by segm. type */
    let div = document.createElement('div');
    div.style.width = `${segment.width}px`;
    div.style.height = `${segment.height}px`;
    div.style.top = `${segment.top}px`;
    div.style.left = `${segment.left}px`;
    div.style.position = 'absolute';
    div.style.zIndex = 99;
    div.style.backgroundColor = `${color}`;
    div.style.opacity = 0.5;

    div.className = segmentationImplType;
    document.body.appendChild(div);
}

/**
 * Switch background image between page screenshot and extracted boxes screenshot
 */
function switchBackgroundImage() {
    if (document.body.style.backgroundImage == window.bgA) {
        document.body.style.backgroundImage = window.bgB;
    } else {
        document.body.style.backgroundImage = window.bgA;
    }
}

/**
 * Hide modal with metrics calculation results
 */
function hideResultsModal() {
    var modal = document.getElementById("myModal");

    if (modal.style.display === "block") {
        modal.style.display = "none";
    }
}

/**
 * Show modal with metrics calculation results
 */
function showResultsModal() {
    var modal = document.getElementById("myModal");

    if (modal.style.display == "block") {
        hideResultsModal();
        return;
    }
    modal.style.display = "block";
}
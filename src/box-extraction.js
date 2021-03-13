 /**
 * Project: Box Clustering Segmentation in Node.js
 * Author: Tomas Zubrik, xzubri00@stud.fit.vutbr.cz
 * Year: 2021
 * License:  GNU GPLv3
 * Description: Functions useful for process of node extraction.
 */

var boxes = [];

/**
 * Extract boxes from all extracted nodes
 * @returns 
 */
async function extractBoxes() {
  await extractNodes(document.body);

  // var boxes = [];

  // // // pozor overlapping nodes!! TODO TODO TODO!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

  // var textBoxes = textNodes.map(node => getTextBoxes(node));
  // boxes = boxes.concat(textBoxes.flat());

  // var imageBoxes = await extractImageBoxes(extraction.imageNodes);
  // boxes = boxes.concat(imageBoxes);

  // var nodesWithBgImage = extraction.otherNodes.filter(node => hasBackgroundImage(node));
  // var nodesWithBgColor = extraction.otherNodes.filter(node => hasBackgroundColor(node));

  // var boxesWithBgImage = await extractBoxesWithBgImageAsync(nodesWithBgImage);
  // var boxesWithBgColor = extractBoxesWithBgColor(nodesWithBgColor);

  // extraction.otherNodes.forEach(otherNode => {
  //   if(isVisible(otherNode)){
  //     var otherBox = getBox(otherNode);
  //     boxes.push(otherBox);
  //   }
  // });

  return boxes;
}

async function extractBoxesWithBgImageAsync(nodes) {

}

function extractBoxesWithBgColor(nodes) {

}

function contains(a, b) {
	return !(
		b.x1 < a.x1 ||
		b.y1 < a.y1 ||
		b.x2 > a.x2 ||
		b.y2 > a.y2
	);
}

async function getBgImgColorAsync(node) {

  const fac = new FastAverageColor();
  var imageUrl, imageColor;

  if(isImageNode(node)) {
    imageUrl = node.currentSrc || node.src;

  } else if(isElementNode(node)){
    var bgImage = getStyle(node).backgroundImage;
    imageUrl = bgImage.slice(4, -1).replace(/["']/g, "");
  }

  imageColor = await fac.getColorAsync(imageUrl);

  return imageColor.hex;

}

function getBgImgColor(node) {
  
  assert(isImageNode(node));

  try {
    const fac = new FastAverageColor();
    var imageColor = fac.getColor(node);
    return imageColor.hex;
  } catch (error) {
    return null;
  }
}

function getBgColor(node) {
  return getStyle(node).backgroundColor;
}

/**
 * Creates box from text node and adds it into the ouput array.
 * @param {Text node} textNode 
 */
function getTextBoxes(textNode) {

  if(!isTextNode(textNode)) { //cyklicka zavislost
    throw "Parameter in function saveTextBox() has to be TextNode!";
  }

  var color, bbox, bboxes, textBoxes=[];
  var range = document.createRange();

  // Every text box has representing parent's color of text
  color = getStyle(textNode.parentElement).color;

  // HTML Element <a> can contain inline icon, that influences size of box
  if(textNode.parentElement.tagName == "A") 
  {
    // Get min.bounding box of parent element
    bboxes = textNode.parentElement.getClientRects();
  } 
  else 
  {
    // Text node on his own needs range to get minimal bounding boxes
    range.selectNodeContents(textNode);
    bboxes = range.getClientRects();  
  }

  // Multiple bounding boxes are possible, because text node may be wrapped into multiple lines
  for(let i=0; i < bboxes.length; i++) {
    //saveTextBox() boxes.push({color: color, bbox: JSON.stringify(bboxes[i])});
    bbox = JSON.stringify(bboxes[i]);
    textBoxes.push({color: color, bbox: bbox})
  }      

  return textBoxes;
}


async function getBoxAsync() {

}

function getBox(node) {
  if(!isElementNode(node)) {
    throw "Parameter in function getBox() has to be ElementNode!";
  }

  var color, bbox;

  // One-child box's background color 
  color = getStyle(node).backgroundColor;

  // Minimal bounding box 
  bbox = JSON.stringify(node.getBoundingClientRect());

  return {color: color, bbox: bbox};
}

async function saveImageBox(img) {
  
  const fac = new FastAverageColor();
  var color = await fac.getColorAsync(img.src);
  var bbox = JSON.stringify(img.getBoundingClientRect());
  return {color: color.hex, bbox: bbox};
}
   
async function createBox(node) {

  var color, bbox;
  var nodes = [];

  if(node.nodeType == Node.TEXT_NODE) {
    color = getElementComputedStyleOfProperty(node.parentElement, 'color');

    if(node.parentElement.tagName == "A") {
      bbox = node.parentElement.getClientRects();
    } else {
      auxTextNodeRange.selectNodeContents(node);
      bbox = auxTextNodeRange.getClientRects();  
    }

    for(let i=0; i < bbox.length; i++) {
      nodes.push({text: node.nodeValue.trim(), color: color, bbox: JSON.stringify(bbox[i])});
    }      

  } else if(node.nodeType == Node.ELEMENT_NODE) {
    color = getElementComputedStyleOfProperty(node, 'background-color');
    bbox = JSON.stringify(node.getBoundingClientRect());
    
    if(node.tagName == "A") {
      const fac = new FastAverageColor();
      const imageUrlValue = getElementComputedStyleOfProperty(node, 'background-image');
      const imageUrl = imageUrlValue.split(/"/)[1];
      await fac.getColorAsync(imageUrl).then(color => {
        nodes.push({node: node.tagName, color: color.hex, bbox: bbox});
      });
    } else {
      nodes.push({node: node.tagName, color:color, bbox: bbox});
    }
  }

  return nodes;
}

async function extractImageBoxes(imageNodes) {
    var imageBoxes = [];
    const fac = new FastAverageColor();
    const colorPremises = imageNodes.map(img => fac.getColorAsync(img.src));
    const colors = await Promise.all(colorPremises);
    const bboxes = imageNodes.map(img => JSON.stringify(img.getBoundingClientRect()));
    
    for(i=0; i<imageNodes.length; i++) {
        imageBoxes[i] = {bbox: bboxes[i], color: colors[i].hex};
    }
    
    return imageBoxes;
}
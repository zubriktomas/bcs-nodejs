/**
 * Project: Box Clustering Segmentation in Node.js
 * Author: Tomas Zubrik, xzubri00@stud.fit.vutbr.cz
 * Year: 2021
 * License:  GNU GPLv3
 * Description: Functions useful for process of box extraction.
 */

/**
 * All extracted boxes 
 */

namespace = {};
namespace.imageNodes = [];
namespace.textNodes = [];
namespace.otherNodes = [];

function extractBoxes() {
  extractNodes(document.body);
  return getTextBox(namespace.textNodes[0]);
}

 /**
  * Extracts all relevant boxes from given web page
  * @param {Root HTML Element from which extraction starts} node 
  * @returns 
  */
function extractNodes(node) {
  
  if(isTextNode(node)) 
  {
    namespace.textNodes.push(node);
    return;
  } 
  else if(isImageNode(node))
  {
      namespace.imageNodes.push(node);
      return; 
  }
  else {
    // Skip element unrelevant nodes
    if(isExcluded(node)) {
        return;
    } 

    if(hasNoBranches(node))
    {
      // Get smallest box and stop recursion
      var smallest = getSmallest(node);

      if(smallest == null) {
        return;
      } else if(isTextNode(smallest)) {
        namespace.textNodes.push(smallest);
      } else if(isImageNode(smallest)) {
        namespace.imageNodes.push(smallest);
      } else {
        namespace.otherNodes.push(smallest);
      }

      return;
    } 
  }

  // Get all valid child nodes
  var childNodes = getChildNodes(node);

  // Recursively extract boxes from child nodes
  for (let i=0; i < childNodes.length; i++) {
    extractNodes(childNodes[i]);
  }
}

/**
 * Get computed style property value of HTML Element
 * @param {HTML Element} element 
 * @param {String that represents HTML Element's property} property 
 * @returns 
 */
function getStylePropertyValue(element, property) {
  return window.getComputedStyle(element, null).getPropertyValue(property);
}

/**
 * Check if given node is visible on webpage.
 * @param {Element or text node} node 
 * @returns true - if it's visible, false - if it's non-visible
 */
 function isVisible(node) {

  if (node.nodeType == Node.ELEMENT_NODE) {
    const bbox = node.getBoundingClientRect();  
    
    // Element explicitly non-visible
    if (bbox.width == 0 || bbox.height == 0) {
      return false;
    }

    // Element implicitly non-visible 
    if(getStylePropertyValue(node, 'visibility') in ["hidden", "collapse"]){
      return false;
    }

    // Element implicitly non-visible
    if(getStylePropertyValue(node, 'display') == "none"){
      return false;
    }

  } else if (node.nodeType == Node.TEXT_NODE) {

    // Text non-visible
    if(node.nodeValue.trim() == "") {
      return false;
    }

    // Check parent's visibility
    return isVisible(node.parentElement);
  }

  // Node supposed to be visible
  return true;
}

/**
* Check if given node should be exluded from further processing.
* @param {Element or text node} node 
* @returns true - if it's excluded, false - if it's not excluded
*/
function isExcluded(node) {

  // List of excluded tag names
  var excludedTagNames = ["STYLE", "SCRIPT", "NOSCRIPT", "IFRAME", "OBJECT"];

  if(node.nodeType == Node.ELEMENT_NODE)
  {
    return excludedTagNames.includes(node.tagName);
  } 
  else if(node.nodeType == Node.TEXT_NODE) 
  {
    return excludedTagNames.includes(node.parentElement.tagName);
  } 
  else {
    // Throws exception when given invalid node type
    throw "Node type has to be TEXT_NODE|ELEMENT_NODE";
  }
}

/**
 * Check if Element has background image
 * @param {HTML Element} element 
 * @returns true, false
 */
function hasBackgroundImage(element) {
  return getStylePropertyValue(element, 'background-image') === 'none';
}

//
async function getImgColorAsync() {

}

function getBgColor() {

}


/**
 * Check if Element has transparent background
 * @param {HTML Element} element 
 * @returns true - has transparent background, false - doesn't have
 */
 function isTransparent(element) {

  var hasNoBgImage = getStylePropertyValue(element, 'background-image') === 'none';
  var hasNoBgColor = getStylePropertyValue(element, 'background-color') === 'rgba(0, 0, 0, 0)';

  // Check background color and image of element if it is transparent
  if(hasNoBgImage && hasNoBgColor) {
    return true;
  } 
  else{
    return false;
  }
}

/**
 * Check if HTML Element has branches
 * @returns true - has no branches, false - has branches
 */
 function hasNoBranches(node) {

  // Create Array from NodeList
  var childNodes = getChildNodes(node);

  // Has one child
  if(childNodes.length == 1){

    // Get first and only valid child
    var child = childNodes[0];

    if(isTextNode(child)) {
      return true;
    } else {
      return hasNoBranches(child);
    }
  } 
  else if (childNodes.length == 0) {
    return true;
  } else {
    return false;
  }
}

function getEndChild(node) {
  var childNodes = getChildNodes(node);

  if(childNodes.length == 1) 
  {
      return getEndChild(childNodes[0]);
  } 
  else 
  {
      return node;
  }
}

function getParentWithBackground(node) {
   
  var hasTransparentParent = isTransparent(node.parentElement);

  if(hasNoBranches(node.parentElement) && !hasTransparentParent) 
  {
      return node.parentElement;
  } 
  else if (!hasTransparentParent) 
  {
      return getParentWithBackground(node.parentElement);
  } 
  else {
      return null;
  }
}



function getChildNodes(node) {
  // Create Array from NodeList
  var childNodes = Array.from(node.childNodes);
  // Filter out non-visible nodes
  childNodes = childNodes.filter(node => isVisible(node));
  return childNodes;
}

function isTextNode(node) {
    return node.nodeType == Node.TEXT_NODE;
}

function isImageNode(node) {
    return node.tagName == "IMG";
}

function isElementNode(node) {
    return !isTextNode(node) && !isImageNode(node);
}

function getSmallest(node) {

  var lastChild = getEndChild(node);

  if(isElementNode(lastChild) && isTransparent(lastChild)) {
      return getParentWithBackground(lastChild);
  } else {
      return lastChild;
  }
}

/**
 * Function for timing the evaluation, testing purposes
 */
function timeTheFunction() {
  var t0 = performance.now()
  extractNodes(document.body);
  var t1 = performance.now()
  console.log("Box Extraction took " + (t1 - t0) + " milliseconds.")
}

/**
 * Creates box from text node and adds it into the ouput array.
 * @param {Text node} textNode 
 */
function getTextBox(textNode) {

  if(textNode.nodeType != Node.TEXT_NODE) {
    throw "Parameter in function saveTextBox() has to be TextNode!";
  }

  var color, bbox, bboxes, textBoxes=[];
  var range = document.createRange();

  // Every text box has representing parent's color of text
  color = getStylePropertyValue(textNode.parentElement, 'color');

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
  if(node.nodeType != Node.ELEMENT_NODE) {
    throw "Parameter in function getBox() has to be ElementNode!";
  }

  var color, bbox;

  // One-child box's background color 
  color = getStylePropertyValue(node, 'background-color');

  // Minimal bounding box 
  bbox = JSON.stringify(node.getBoundingClientRect());

  // Save one-child box into output set of boxes
  // boxes.push({color: color, bbox: JSON.stringify(bbox)});
  // boxes.push(node);
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

async function extractImageNodes(imageNodes) {
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
 /**
 * Project: Box Clustering Segmentation in Node.js
 * Author: Tomas Zubrik, xzubri00@stud.fit.vutbr.cz
 * Year: 2021
 * License:  GNU GPLv3
 * Description: Functions useful for process of node extraction.
 */

 /**
 * Box Extraction namespace to handle global variables
 */
extraction = {
    imageNodes: imageNodes = [],
    textNodes: textNodes = [],
    otherNodes: otherNodes = []
  };
 
 /**
  * Extracts all relevant nodes from given web page
  * @param {Root HTML Element from which extraction starts} node 
  * @returns 
  */
async function extractNodes(node) {

    if(isTextNode(node)) 
    {
      // extraction.textNodes.push(node);
      boxes = boxes.concat(getTextBoxes(node));
      return;
    } 
    else if(isImageNode(node))
    {
        // extraction.imageNodes.push(node);
        return; 
    }
    else {
      // Skip element unrelevant nodes
      if(isExcluded(node)) {
          return;
      } 
  
      if(hasNoBranches(node))
      {
        console.log(node, "hasNoBranches");

        // Get smallest box and stop recursion
        var smallest = getSmallest(node);

        console.log(node, "getSmallest");
  
        if(smallest == null) {
            return;
        } else if(isTextNode(smallest)) {
          boxes = boxes.concat(getTextBoxes(smallest));
            // extraction.textNodes.push(smallest);
        } else if(isImageNode(smallest)) {
            // extraction.imageNodes.push(smallest);
        } else if(isElementNode(smallest)) {
            // extraction.otherNodes.push(smallest);
            boxes.push(getBox(smallest));
        }
  
        return;
      } 
    }
  
    // Get all valid child nodes
    var childNodes = getChildNodes(node);
  
    // Recursively extract child nodes
    for (let i=0; i < childNodes.length; i++) {
      await extractNodes(childNodes[i]);
    }
}

/**
 * Check if Element has transparent background
 * @param {HTML Element} element 
 * @returns true - has transparent background, false - doesn't have
 */
function isTransparent(element) {

    if(isImageNode(element)) {
      return false;
    }

    var hasNoBgImage = getStyle(element).backgroundImage === 'none';
    var hasNoBgColor = getStyle(element).backgroundColor === 'rgba(0, 0, 0, 0)';

    // Check background color and image of element if it is transparent
    if(hasNoBgImage && hasNoBgColor) {
      return true;
    } 
    else{
      return false;
    }
}

/**
 * Check if given node is visible on webpage.
 * @param {Element or text node} node 
 * @returns true - if it's visible, false - if it's non-visible
 */
function isVisible(node) {

    if (isElementNode(node)) {
      const bbox = node.getBoundingClientRect();  
      
      // Element explicitly non-visible
      // if (bbox.width == 0 || bbox.height == 0) {
      //   return false;
      // }
  
      // Element implicitly non-visible 
      if(getStyle(node).visibility in ["hidden", "collapse"]){
        return false;
      }
  
      // Element implicitly non-visible
      if(getStyle(node).display == "none"){
        return false;
      }
  
    } else if (isTextNode(node)) {
  
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
  
    if(isElementNode(node))
    {
        return excludedTagNames.includes(node.tagName);
    } 
    else if(isTextNode(node)) 
    {
        return excludedTagNames.includes(node.parentElement.tagName);
    } 
    else {
        return true;
    }
}
  
/**
 * Check if Element has background image
 * @param {HTML Element} element 
 * @returns true, false
 */
function hasBackgroundImage(element) {
  return getStyle(element).backgroundImage != 'none';
}

function hasBackgroundColor(element) {
  return getStyle(element).backgroundColor != 'rgba(0, 0, 0, 0)';
}

/**
 * Check if HTML Element has branches
 * @returns true - has no branches, false - has branches
 */
 function hasNoBranches(node) {

    var childNodes = getChildNodes(node);

    if(childNodes.length == 1){
  
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
  
function getLastChild(node) {

    var childNodes = getChildNodes(node);
  
    if(childNodes.length == 1) {
        return getLastChild(childNodes[0]);
    } else {
        return node;
    }
}
  
function getParentWithBackground(node) {
    
    var parent = node.parentElement;
    var isParentTransparent = isTransparent(parent);

    if(hasNoBranches(parent) && !isParentTransparent) {
        return parent;
    } else if (!isParentTransparent) {
        return getParentWithBackground(parent);
    } else {
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
    return node.nodeType == Node.ELEMENT_NODE;
}
  
function getSmallest(node) {

    var lastChild = getLastChild(node);

    if(isElementNode(lastChild) && isTransparent(lastChild)) {
        return getParentWithBackground(lastChild);
    } else {
        return lastChild;
    }
}
 /**
 * Project: Box Clustering Segmentation in Node.js
 * Author: Tomas Zubrik, xzubri00@stud.fit.vutbr.cz
 * Year: 2021
 * License:  GNU GPLv3
 * Description: Functions useful for process of node extraction.
 */

/**
 * Extract boxes from all extracted nodes
 * @returns color.hex
 */

async function getBgImgColorAsync(node) {

  assert(isElementNode(node));

  const fac = new FastAverageColor();
  var imageUrl, imageColor;

  if(isImageNode(node)) {
    imageUrl = node.currentSrc || node.src;

  } else if(isElementNode(node)){
    var bgImage = getStyle(node).backgroundImage;
    regex = /(?:\(['"]?)(.*?)(?:['"]?\))/,
    imageUrl = regex.exec(bgImage)[1];
  }

  if(imageUrl.startsWith("http")){
    imageColor = await fac.getColorAsync(imageUrl);
    return imageColor.hex;
  } else {
    return imageUrl;
  }
}

function getBgImgColor(img) {
  
  assert(isImageNode(img), "Function getBgImgColor() applicable only on imageNodes!");

  const fac = new FastAverageColor();
  var imageColor = fac.getColor(img);
  return imageColor.hex;
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
    bbox = JSON.stringify(bboxes[i]);
    textBoxes.push({color: color, bbox: bbox})
  }      

  return textBoxes;
}


async function getElementBox(node) {

  assert(isElementNode(node), "Parameter in function getElementBox() has to be ElementNode!");

  var color, bbox;

  if(hasBackgroundColor(node)) { 
    color = getBgColor(node);
  } else if (hasBackgroundImage(node)) {
    color = await getBgImgColorAsync(node);
  }

  bbox = JSON.stringify(node.getBoundingClientRect());

  return {color: color, bbox: bbox};
}

async function getImageBox(img) {

  assert(isImageNode(img));

  var bbox = JSON.stringify(img.getBoundingClientRect());
  var color;
  
  if((color = getBgImgColor(img)) == "#000000") {
      color = await getBgImgColorAsync(img);
  }
    
  return {color: color, bbox: bbox};
}
   
 /**
  * Extracts all relevant nodes from given web page
  * @param {Root HTML Element from which extraction starts} node 
  * @returns 
  */
  async function extractBoxes() {

    var boxes = [];
    await extract(document.body);
    return boxes;
  
    async function extract(node) {
  
      if(isTextNode(node)) 
      {
        boxes = boxes.concat(getTextBoxes(node));
      } 
      else if(isImageNode(node))
      {
        boxes.push(await getImageBox(node));
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
            boxes = boxes.concat(getTextBoxes(smallest));
          } else if(isImageNode(smallest)) {
            boxes.push(await getImageBox(smallest));
          } else if(isElementNode(smallest)) {
            boxes.push(await getElementBox(smallest));
          }
  
        } else {
          // Get all valid child nodes
          var childNodes = getChildNodes(node);
        
          // Recursively extract child nodes
          for (let i=0; i < childNodes.length; i++) {
            await extract(childNodes[i]);
          }
        }
      }
    }

    function removeContaining(boxes) {
      var count = boxes.length;

      var containers = [];
      for (let contained = 0; i < count; i++) {
        for (let possible_container = 0; j < count; j++) {
          if(contained != possible_container) {
            if(containsBox(boxes[possible_container], boxes[contained])) {
              containers.push(possible_container);
            }
          }
        }        
      }
      return containers;
    }

    /**
     * Check if box1 contains box2
     * @param {Box} box1 Possible container
     * @param {Box} box2 Contained
     * @returns 
     */
    function containsBox(box1, box2) {
      var bbox1, bbox2, t1, l1, b1, r1, t2, l2, b2, r2;

      bbox1 = JSON.parse(box1.bbox);
      bbox2 = JSON.parse(box2.bbox);

      t1 = bbox1.top;
      l1 = bbox1.left;
      r1 = bbox1.bottom;
      b1 = bbox1.right;

      t2 = bbox2.top;
      l2 = bbox2.left;
      r2 = bbox2.bottom;
      b2 = bbox2.right;

      if(r2 <= r1 && l2 >= l1 && t2 >= t1 && b2 <= b1){
        return true;
      } else {
        return false;
      }
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

      if(!hasBackgroundColor(element) && !hasBackgroundImage(element)) {
        return true;
      } else {
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
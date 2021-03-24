 /**
 * Project: Box Clustering Segmentation in Node.js
 * Author: Tomas Zubrik, xzubri00@stud.fit.vutbr.cz
 * Year: 2021
 * License:  GNU GPLv3
 * Description: Functions useful for process of node extraction.
 */

/**
 * Box Structure
 */
class Box {
  /**
   * 
   * @param {DOMRect} bbox 
   * @param {string} color 
   */

  constructor(bbox, color) {
    this.id = `(t: ${bbox.top}, l:${bbox.left}, b:${bbox.bottom}, r:${bbox.right}, c:${color})`;
    this.left = bbox.left;
    this.right = bbox.right;
    this.top = bbox.top;
    this.bottom = bbox.bottom;
    this.width = bbox.width;
    this.height = bbox.height;
    this.color = color;
    this.maxNeighbourDistance = 0;
    this.relations = [];
    this.neighbours = [];
  }

  /**
   * 
   * @param {*} box 
   * @returns 
   */
  contains(box) {
    return this.top <= box.top && this.left <= box.left &&
            this.bottom >= box.bottom && this.right >= box.right;
  }

  /**
   * 
   * @param {*} boxes 
   * @returns 
   */
  containsAny(boxes) {
    var boxIndex = boxes.indexOf(this);
    var boxesCount = boxes.length;

    for (let i = 0; i < boxesCount; i++) {
      if(boxIndex == i) {
        continue;
      }

      if(this.contains(boxes[i])){
        return true;
      }
    }

    return false;
  }
}

 /**
  * Extracts all relevant boxes from given web page
  * @returns boxes
  */
  async function extractBoxes() {

    var boxes = [];
    await extract(document.body);
    // return getValidBoxes(boxes);
    return boxes;

    /**
     * 
     * @param {Box[]} boxes 
     * @returns 
     */
    function getValidBoxes(boxes) {
      var validBoxes = [];
      var boxesCount = boxes.length;

      for (let i = 0; i < boxesCount; i++) {
        if(!boxes[i].containsAny(boxes)) {
          validBoxes.push(boxes[i]);
        }
      }
      return validBoxes;
    }
  
    /**
     * 
     * @param {Node} node 
     * @returns 
     */
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
  }
  
/**
 * Get average color of background image of HTML element
 * @param {Node} node 
 * @returns 
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
    return imageColor.rgb;
  } else {
    return imageUrl;
  }
}

/**
 * 
 * @param {Node} img 
 * @returns 
 */
function getBgImgColor(img) {
  
  assert(isImageNode(img), "Function getBgImgColor() applicable only on imageNodes!");

  const fac = new FastAverageColor();
  var imageColor = fac.getColor(img);
  return imageColor.rgb;
}


/**
 * 
 * @param {Node} node 
 * @returns 
 */
function getBgColor(node) {
  return getStyle(node).backgroundColor;
}

/**
 * Creates box from text node and adds it into the ouput array.
 * @param {Node} textNode 
 */
function getTextBoxes(textNode) {

  assert(isTextNode(textNode), "Parameter in function saveTextBox() has to be TextNode!");

  var color, bboxes, textBoxes=[];

  // Every text box's representing color is parent's color of text
  color = getStyle(textNode.parentElement).color;
  bboxes = getBoundingBoxes(textNode);
  
  // Multiple bounding boxes are possible, because text node may be wrapped into multiple lines
  for(let i=0; i < bboxes.length; i++) {
    // textBoxes.push({color: color, bbox: bboxes[i]})
    textBoxes.push(new Box(bboxes[i], color));
  }      

  return textBoxes;
}

/**
 * 
 * @param {Node} textNode 
 * @returns {DOMRect[]} array
 */
function getBoundingBoxes(textNode) {
  assert(isTextNode(textNode));
  
  // Maybe should be deleted
  const isInvalidbbox = (bbox) => {
    var bboxParent = getBoundingBox(textNode.parentElement);

    if(bboxParent.left > bbox.left || bboxParent.top > bbox.top || bboxParent.bottom < bbox.bottom || bboxParent.right < bbox.right){
      return true;
    }
    else if(bbox.left < 0 || bbox.top < 0 || bbox.bottom < 0 || bbox.right < 0 || bbox.width==0 || bbox.height ==0) {
      return true;
    } else {
      return false;
    }
  };

  var range, rects, rectsLength, bbox, bboxes = [];

  range = document.createRange();
  range.selectNodeContents(textNode);

  if(isInvalidbbox(range.getBoundingClientRect())) {
    return [];
  }


  rects = range.getClientRects();  
  rectsLength = rects.length;

  // Multiple bounding boxes are possible, because text node may be wrapped into multiple lines
  for(let i=0;  i < rectsLength; i++) {
    bbox=rects[i];
    // if(!(isInvalidbbox(bbox))) {
      bboxes.push(bbox);
    // }
  }      
  return bboxes;
}

/**
 * 
 * @param {*} node 
 * @returns 
 */
function getBoundingBox(node) {
  assert(isElementNode(node));

  var bbox = node.getBoundingClientRect();
  return bbox;
}

/**
 * 
 * @param {*} node 
 * @returns 
 */
async function getElementBox(node) {

  assert(isElementNode(node), "Parameter in function getElementBox() has to be ElementNode!");

  var bbox, color;

  bbox = getBoundingBox(node);

  if(hasBackgroundColor(node)) { 
    color = getBgColor(node);
  } else if (hasBackgroundImage(node)) {
    color = await getBgImgColorAsync(node);
  }

  return new Box(bbox, color);
}

/**
 * 
 * @param {*} node 
 * @returns 
 */
async function getImageBox(node) {

  assert(isImageNode(node));

  var bbox, color;
  
  bbox = getBoundingBox(node);
  
  // if((color = getBgImgColor(node)) == "#000000") {
      color = await getBgImgColorAsync(node);
  // }
    
  return new Box(bbox, color);
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
        // const bbox = getBoundingBox(node);  
        // Element explicitly non-visible
        // if (bbox.width == 0 || bbox.height == 0) {
        //   return false;
        // }
    
        var style = getStyle(node);

        // Element implicitly non-visible 
        if(style.visibility == "hidden" || style.visibility == "collapse"){
          return false;
        }
    
        // Element implicitly non-visible
        if(style.display == "none"){
          return false;
        }
    
      } else if (isTextNode(node)) {
    
        // Text non-visible
        if(node.nodeValue.trim() == "") {
          return false;
        }
    
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

  
  /**
   * 
   * @param {*} element 
   * @returns 
   */
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
    
  /**
   * 
   * @param {*} node 
   * @returns 
   */
  function getLastChild(node) {
  
      var childNodes = getChildNodes(node);
    
      if(childNodes.length == 1) {
          return getLastChild(childNodes[0]);
      } else {
          return node;
      }
  }
    
  /**
   * 
   * @param {*} node 
   * @returns 
   */
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
  
  /**
   * 
   * @param {*} node 
   * @returns 
   */
  function getChildNodes(node) {

      var childNodes = node.childNodes;
      var childNodesCount = childNodes.length;
      var validChildNodes = [];

      for (let i = 0; i < childNodesCount; i++) {
        var child = childNodes[i];
        if(isVisible(child)) {
          validChildNodes.push(child);
        }
        
      }

      return validChildNodes;
  }
  
  /**
   * 
   * @param {*} node 
   * @returns 
   */
  function isTextNode(node) {
      return node.nodeType == Node.TEXT_NODE;
  }
  
  /**
   * 
   * @param {*} node 
   * @returns 
   */
  function isImageNode(node) {
      return node.tagName == "IMG";
  }

  /**
   * 
   * @param {*} node 
   * @returns 
   */  
  function isElementNode(node) {
      return node.nodeType == Node.ELEMENT_NODE;
  }

  /**
   * 
   * @param {*} node 
   * @returns 
   */  
  function getSmallest(node) {
  
      var lastChild = getLastChild(node);
  
      if(isElementNode(lastChild) && isTransparent(lastChild)) {
          return getParentWithBackground(lastChild);
      } else {
          return lastChild;
      }
  }
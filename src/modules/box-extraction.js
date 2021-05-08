/**
* Project: Box Clustering Segmentation in Node.js
* Author: Tomas Zubrik, xzubri00@stud.fit.vutbr.cz
* Year: 2021
* License:  GNU GPLv3
* Description: Extraction process of boxes from webpage (root node)
*/

const COLOR_GREY = "rgb(128, 128, 128)";

/**
* Extracts all relevant boxes for given web page from specified root node
* @param {Node} node Root node of extraction process
* @param {boolean} ignoreImage ignore avg color calculation, use default grey
* @returns List of boxes
*/
async function extractBoxes(node, ignoreImages) {

  /* List of extracted boxes */
  var boxes = [];

  /* Call recursive extract, that access local (but "global") boxes list */
  await extract(node, ignoreImages);

  /* Return extracted boxes */
  return boxes;

  /**
   * Local recursive function for boxes extraction
   * @param {Node} node Root node
   * @param {boolean} ignoreImage ignore avg color calculation, use default grey
   * @returns void
   */
  async function extract(node, ignoreImages) {

    if (isTextNode(node)) {
      if(isInViewport(node.parentElement)) boxes = boxes.concat(getTextBoxes(node));
    }
    else if (isImageNode(node)) {
      if(isInViewport(node)) boxes = boxes.concat(await getImageBox(node, ignoreImages));
    }
    else {
      /* Skip excluded nodes */
      if (isExcluded(node)) {
        return;
      }

      if (hasNoBranches(node)) {
        /* Get smallest box and stop recursion */
        var smallest = getSmallest(node);

        if(!smallest || !isInViewport(isElementNode(smallest) ? smallest : smallest.parentElement)) {
          return;
        }

        if (isTextNode(smallest)) {
          boxes = boxes.concat(getTextBoxes(smallest));
        } else if (isImageNode(smallest)) {
          boxes = boxes.concat(await getImageBox(smallest, ignoreImages));
        } else if (isElementNode(smallest)) {
          boxes = boxes.concat(await getElementBox(smallest, ignoreImages));
        }

      } else {
        /* Get all valid child nodes */
        var childNodes = getChildNodes(node);

        /* Recursively extract boxes from child nodes */
        for (const childNode of childNodes) {
          await extract(childNode, ignoreImages);
        }
      }
    }
  }
}

async function extractAllNodesAsBoxes(node, ignoreImages) {

  /* List of extracted boxes */
    var boxes = [];
    var nodes = document.querySelectorAll("*");

    for (const node of nodes) {
      if (isExcluded(node)) {
        continue;
      }

      if (isTextNode(node)) {
        if(isInViewport(node.parentElement)) boxes = boxes.concat(getTextBoxes(node));
      }
      else if (isImageNode(node)) {
        if(isInViewport(node)) boxes = boxes.concat(await getImageBox(node, ignoreImages));
      } 
      else if (isElementNode(node)) {
        if(isInViewport(node)) boxes = boxes.concat(await getElementBox(node, ignoreImages));
      }
    }
    return boxes;
}


/**
 * Get average color of background image of HTML element
 * @param {Node} node 
 * @returns average color | grey color (default)
 */
async function getBgImgColorAsync(node) {

  assert(isElementNode(node));

  /* Local constant */
  // const COLOR_GREY = "rgb(128, 128, 128)";

  /* Module for average color extraction */
  const fac = new FastAverageColor();

  var imageUrl, imageColor;

  if (isImageNode(node)) {
    imageUrl = node.currentSrc || node.src;
  } else if (isElementNode(node)) {
    var bgImage = getStyle(node).backgroundImage;
    regex = /(?:\(['"]?)(.*?)(?:['"]?\))/,
      /* Remove 'url('...')' from element background image CSS style */
      imageUrl = regex.exec(bgImage)[1];
  }

  if (imageUrl.startsWith("http") || imageUrl.startsWith("data")) {
    try {
      imageColor = await fac.getColorAsync(imageUrl);
    } catch (e) {
      /* Return default color if image color cannot be extracted - CORS policy | extraction error */
      return COLOR_GREY;
    }

    /* Return calculated average color */
    return imageColor.rgb;

    /* Image background probably specified by CSS color (f.e. gradient) */
  } else {
    return imageUrl;
  }
}

/**
 * Get image background average color (synchronously by using canvas)
 * @param {Node} img 
 * @returns average color | black color (in case of FAC error)
 */
function getBgImgColor(img) {

  assert(isImageNode(img), "Function getBgImgColor() applicable only on imageNodes!");

  const fac = new FastAverageColor();
  var imageColor = fac.getColor(img.src);
  return imageColor.rgb;
}

/**
 * Get background color of element from style
 * @param {Node} node 
 * @returns background color
 */
function getBgColor(node) {
  return getStyle(node).backgroundColor;
}

/**
 * Get element box from element node
 * @param {Node} node 
 * @param {boolean} ignoreImage ignore avg color calculation, use default grey
 * @returns BoxInfo
 */
async function getElementBox(node, ignoreImages) {

  assert(isElementNode(node), "Parameter in function getElementBox() has to be ElementNode!");

  var bbox, color;

  bbox = getBoundingBox(node);

  /* Return empty array, it will be concatenated with boxes, so wont be changed */
  if(!bbox) return [];

  if (hasBackgroundColor(node)) {
    color = getBgColor(node);
  } else if (hasBackgroundImage(node)) {
    if (ignoreImages) {
      color = COLOR_GREY;
    } else {
      color = await getBgImgColorAsync(node);
    }
  }

  return new BoxInfo(bbox, color ? color : COLOR_GREY);
}

/**
 * Get image box from image node
 * @param {Node} node 
 * @param {boolean} ignoreImage ignore avg color calculation, use default grey
 * @returns BoxInfo
 */
async function getImageBox(node, ignoreImages) {

  assert(isImageNode(node));

  var bbox, color;

  bbox = getBoundingBox(node);

  /* Return empty array, it will be concatenated with boxes, so wont be changed */
  if(!bbox) return [];

  if (ignoreImages) {
    color = COLOR_GREY;
  } else if ((color = getBgImgColor(node)) == "rgb(0,0,0)") {
    color = await getBgImgColorAsync(node);
  }

  return new BoxInfo(bbox, color);
}

/**
 * Creates box from text node and adds it into the ouput array.
 * @param {Node} textNode 
 */
function getTextBoxes(textNode) {

  assert(isTextNode(textNode), "Parameter in function saveTextBox() has to be TextNode!");

  var color, bboxes, textBoxes = [];

  /* Representative color of every text box is parent's color of text */
  color = getStyle(textNode.parentElement).color;

  /* Regex taken from: https://stackoverflow.com/questions/14741291/how-to-check-if-the-css-background-color-is-white */
  const checkWhite = (color) => color.match(/^(?:white|#fff(?:fff)?|rgba?\(\s*255\s*,\s*255\s*,\s*255\s*(?:,\s*1\s*)?\))$/i);

  /* Change white color to slightly greyer color, because boxes are not visible in vizualization */
  color = checkWhite(color) ? "rgb(240, 240, 240)" : color;

  /* Get multiple bounding boxes - text node can be wrapped into multiple lines */
  bboxes = getBoundingBoxes(textNode);

  for (const bbox of bboxes) {
    textBoxes.push(new BoxInfo(bbox, color));
  }

  return textBoxes;
}

/**
 * @param {*} element 
 * @returns 
 */
function isInViewport(element) {
  const rect = element.getBoundingClientRect();
  return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

/**
 * Get bounding box of HTML node
 * @param {Node} node 
 * @returns 
 */
function getBoundingBox(node) {
  assert(isElementNode(node));

  var bbox = node.getBoundingClientRect();
  return bbox.width && bbox.height ? bbox : null;
}

/**
 * Get multiple bounding boxes from text node
 * @param {Node} textNode 
 * @returns {DOMRect[]} array of bboxes | []
 */
function getBoundingBoxes(textNode) {
  assert(isTextNode(textNode));

  /**
   * Check if bbox is valid (local function)
   * @param {*} bbox textnode bbox
   * @returns true|false
   */
  const isInvalidbbox = (bbox) => {
    var bboxParent = getBoundingBox(textNode.parentElement);

    if(!bboxParent) return true;

    /* Invalid if parent bbox is smaller than given text node, text is probably hidden in very small parent element */
    if (bboxParent.width < bbox.width && bboxParent.height < bbox.height) {
      return true;
    }
    else if (bbox.left < 0 || bbox.top < 0 || bbox.bottom < 0 || bbox.right < 0 || bbox.width == 0 || bbox.height == 0) {
      return true;
    } else {
      return false;
    }
  };

  /* Create range to get bbox from part of text node */
  var range = document.createRange();

  /* Select text node contents */
  range.selectNodeContents(textNode);

  /* Check bbox of whole text node */
  if (isInvalidbbox(range.getBoundingClientRect())) {
    return [];
  }

  /* Get array of bboxes for every part of possibly wrapped text node */
  var rects = range.getClientRects();

  var bboxes = [];
  for (const rectAsbbox of rects) {
    bboxes.push(rectAsbbox);
  }

  /* Return all valid bboxes or empty array */
  return bboxes;
}

/**
 * Check if Element has transparent background
 * @param {Node} element
 * @returns true | false
 */
function isTransparent(element) {

  if (isImageNode(element)) {
    return false;
  }

  if (hasBackgroundColor(element) || hasBackgroundImage(element)) {
    return false;
  } else {
    return true;
  }
}

/**
 * Check if given node is visible on webpage.
 * @param {Node} node
 * @returns true | false
 */
function isVisible(node) {

  if (isElementNode(node)) {
    var style = getStyle(node);

    /* Element implicitly non-visible */
    if (style.visibility == "hidden" || style.visibility == "collapse") {
      return false;
    }

    /* Element implicitly non-visible */
    if (style.display == "none") {
      return false;
    }

  } else if (isTextNode(node)) {

    /* Text non-visible - empty string | \n | \cr and so on */
    if (node.nodeValue.trim() == "") {
      return false;
    }
  }

  /* Node supposed to be visible */
  return true;
}

/**
 * Check if given node should be exluded from further processing.
 * @param {Element or text node} node
 * @returns true - if it's excluded, false - if it's not excluded
 */
function isExcluded(node) {

  /* List of excluded tag names */
  var excludedTagNames = ["STYLE", "SCRIPT", "NOSCRIPT", "IFRAME", "OBJECT"];

  if(!node){
    return true;
  }

  if (isElementNode(node)) {
    return excludedTagNames.includes(node.tagName);
  }
  else if (isTextNode(node)) {
    return excludedTagNames.includes(node.parentElement.tagName);
  }
  else {
    return true;
  }
}

/**
 * Check if HTML Element has branches
 * @returns true - has no branches, false - has branches
 */
function hasNoBranches(node) {

  var child, childNodes = getChildNodes(node);

  if (childNodes.length == 1) {

    child = childNodes[0];

    if (isTextNode(child)) {
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
 * Get smallest valid node from root node (according to BCS paper)
 * @param {Node} node 
 * @returns smallest node
 */
function getSmallest(node) {

  var lastChild = getLastChild(node);

  console.log(lastChild);

  if (lastChild != null && isElementNode(lastChild) && isTransparent(lastChild)) {
    return getParentWithBackground(lastChild);
  } else {
    return lastChild;
  }
}

/**
 * Get last one-child node of given node
 * @param {Node} node 
 * @returns last one-child node
 */
function getLastChild(node) {

  var childNodes = getChildNodes(node);

  if (childNodes.length == 1) {
    return getLastChild(childNodes[0]);
  } else {
    return node;
  }
}

/**
 * Get top (one-child) parent node with non-transparent background (recursive)
 * @param {Node} node 
 * @returns parent node with non-transparent bg | null (if does not exist)
 */
function getParentWithBackground(node) {

  var parent = node.parentElement;

  if(!parent) return null;

  var isParentTransparent = isTransparent(parent);

  if (hasNoBranches(parent) && !isParentTransparent) {
    return parent;
  } else if (!isParentTransparent) {
    return getParentWithBackground(parent);
  } else {
    return null;
  }
}

/**
 * Get all valid (visible) child nodes of given node
 * @param {Node} node 
 * @returns List of visible child nodes
 */
function getChildNodes(node) {

  var validChildNodes = [], childNodes = node.childNodes;

  for (const childNode of childNodes) {
    if (isVisible(childNode)) {
      validChildNodes.push(childNode);
    }
  }
  return validChildNodes;
}

/* Helper functions */
const isElementNode = (node) => node && node.nodeType == Node.ELEMENT_NODE;
const isTextNode = (node) => node && node.nodeType == Node.TEXT_NODE;
const isImageNode = (node) => node && node.tagName == "IMG";
const hasBackgroundImage = (node) => getStyle(node).backgroundImage != 'none';
const hasBackgroundColor = (node) => getStyle(node).backgroundColor != 'rgba(0, 0, 0, 0)';

/**
 * Get computed style of HTML element
 * @param {Node} element 
 * @returns computed style of element
 */
const getStyle = (element) => { return window.getComputedStyle(element, false) };

/**
 * Assert condition and thow error if it false
 * @param {boolean} condition 
 * @param {string} message 
 */
const assert = (condition, message) => {
  if (!condition) throw Error('Assert failed: ' + (message || ''))
};
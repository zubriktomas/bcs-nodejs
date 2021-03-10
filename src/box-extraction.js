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
 var boxes = [];
 var imageNodes = [];
 var textNodes = [];
 var otherNodes = [];

 /**
  * Extracts all relevant boxes from given web page
  * @param {Root HTML Element from which extraction starts} node 
  * @returns 
  */
 function extractBoxes(node) {
   
   if(node.nodeType == Node.TEXT_NODE) 
   {
     // Skip text nodes that aren't visible 
     if(!isVisible(node)) {
       return;
     } 
 
    //  saveTextBox(node);
     textNodes.push(node);
     return;
 
   } 
   else if (node.nodeType == Node.ELEMENT_NODE) 
   {
     // Skip element unrelevant nodes
     if(isExcluded(node)) {
         return;
     } 
 
     // Image node
     if(node.tagName == "IMG") 
     {
      //  saveImageBox(node);
      images.push(node);
     } 
     else
     {
         if(hasNoBranches(node))
         {
           saveSmallestBox(node);
         }
     } 
   }
 
 
    // Recursively extract boxes from child nodes
    for (let i=0; i < node.childNodes.length; i++) {
     extractBoxes(node.childNodes[i]);
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
 * Check if Element has transparent background
 * @param {HTML Element} element 
 * @returns true - has transparent background, false - doesn't have
 */
 function isTransparent(element) {

  var hasNoBgImage = getStylePropertyValue(element, 'background-image') === 'none';
  var hasNoBgColor = getStylePropertyValue(element, 'background-color') === 'rgba(0, 0, 0, 0)';

  // Check background color and image of element if it is transparent
  if(hasNoBgImage && hasNoBgColor) 
  {
    return true;
  }
}

/**
 * Check if HTML Element has branches
 * @returns true - has no branches, false - has branches
 */
function hasNoBranches(node) {

  var childNodesCount = node.childNodes.length;

  // Has branches
  if(childNodesCount > 1) {
    return false;
  }

  // Has no branches - it is one-child node
  if(childNodesCount == 0) {
    return true;
  }

  if(node.childNodes.length == 1){

    // If element's only child is text node 
    if(node.childNodes[0].nodeType == Node.TEXT_NODE) 
    {
      return true;
    } 
    else
    {
      // Continue to leaves recursively
      hasNoBranches(node.childNodes[0]);
    }
  } 
}

function saveSmallestBox(node) {
  var childNodesCount = node.childNodes.length;
  var child, bgColor;

  if(childNodesCount == 0)
  {
    saveBox(node);
  }
  else
  {
    child = node.childNodes[0];
    // bgColor = getBgColor(node, parentBg);

    if(child.nodeType == Node.TEXT_NODE)
    {
      saveTextBox(child);
    } 
    else if(child.tagName == "IMG") 
    {
      // saveImageBox(child);
    }
    else
    {
      if(isTransparent(node))
      {
        saveSmallestBox(child, parentBg);
      }
      else
      {
        saveBox(child, parentBg);
      }
    }


  } 

}

/**
 * Function for timing the evaluation, testing purposes
 */
function timeTheFunction() {
  var t0 = performance.now()
  extractBoxes(document.body);
  var t1 = performance.now()
  console.log("Box Extraction took " + (t1 - t0) + " milliseconds.")
}

/**
 * Creates box from text node and adds it into the ouput array.
 * @param {Text node} textNode 
 */
function saveTextBox(textNode) {

  if(textNode.nodeType != Node.TEXT_NODE) {
    throw "Parameter in function saveTextBox() has to be TextNode!";
  }

  var color, bboxes;
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
    boxes.push({color: color, bbox: JSON.stringify(bboxes[i])});
  }      
}

function saveBox(oneChildNode) {
  if(oneChildNode.nodeType != Node.ELEMENT_NODE) {
    throw "Parameter in function saveBox() has to be ElementNode!";
  }

  var color, bbox;

  // One-child box's background color 
  color = getStylePropertyValue(oneChildNode, 'background-color');

  // Minimal bounding box 
  bbox = oneChildNode.getBoundingClientRect();

  // Save one-child box into output set of boxes
  // boxes.push({color: color, bbox: JSON.stringify(bbox)});
  boxes.push(oneChildNode);

}

async function saveImageBox(img) {
  
  const fac = new FastAverageColor();
  var color = await fac.getColorAsync(img.src);
  var bbox = JSON.stringify(img.getBoundingClientRect());
  return {color: color.hex, bbox: bbox};
//     // boxes.push({color: color, bbox: bbox});
}




   
// function isOneChildNode(node) {

//   // koniec rekurzie - je oneChildNode
//   if(node.childNodes.length == 0){
//     for (let i = 0; i < node.childNodes.length; i++) {
//       if(node.childNodes[i].nodeValue.trim() != "") {
//         return false;
//       }
//     }
//     return true;  
//   } 

//   // koniec rekurzie - nie je oneChildNode
//   if(node.childNodes.length > 1) {
//       return false;
//   }

//   return isOneChildNode(node.firstElementChild);
// }
    
// function containsSmallerBoxWithNontransparentBackgroundOrText(oneChildNode) {

//     if(oneChildNode.childElementCount == 1){
//         if(hasTransparentBackground(oneChildNode.firstElementChild)) {
//             return containsSmallerBoxWithNontransparentBackgroundOrText(oneChildNode.firstElementChild);      
//         } else {
//             return true;
//         }
//     }

//     if(oneChildNode.hasChildNodes()) {
//       for (let i = 0; i < oneChildNode.childNodes.length; i++) {

//         // one child node contains text node
//         if(oneChildNode.childNodes[i].data.trim() != "") {
//           return true;
//         }
        
//       }
//     }
      
//     return false;
// }
    
// function hasOneChildParentWithNontransparentBackground(oneChildNode) {
//     if(oneChildNode.parentElement.childElementCount > 1) {
//         return false;
//     }

//     if(hasTransparentBackground(oneChildNode.parentElement)) {
//         return hasOneChildParentWithNontransparentBackground(oneChildNode.parentElement);
//     }

//     return true;
// }
    
//     // TODO: Pozor!, v hlavnom cykle traverse ak najdem node, ktory je selected, dalej (hlbsie v strome) nepokracujem!
//     // odpada kontrola listoveho uzla
// function isSelectedOneChildNode(oneChildNode) {
  
//   if(!isVisible(oneChildNode)) {
//     return false;
//   }


//   if(!isOneChildNode(oneChildNode)) {
//     return false;
//   }

//   if(containsSmallerBoxWithNontransparentBackgroundOrText(oneChildNode)) {
//       return false;
//   } else {
//     // oneChildNode s potomkom
//     if(oneChildNode.childElementCount == 1){
//         return !hasTransparentBackground(oneChildNode);
      
//     // leaf, mozno nemusim riesit - problem s pripadom, kedy su vsetky parentske oneChildNody bez pozadia
//     } else {
//         if(hasTransparentBackground(oneChildNode)) {
            
//             if(hasOneChildParentWithNontransparentBackground(oneChildNode)) {
//                 return false;
//             } else {
//                 return true;
//             }
//         } else {
//             return false;
//         }
//     }
    
//   }
// }
    
 
// function traverse(node) {
//   if (node.nodeType == Node.ELEMENT_NODE || node.nodeType == Node.DOCUMENT_NODE) {

//     // exclude elements with invisible text nodes
//     if (isExcluded(node)) {
//       return
//     }

//     // if(node.tagName == "IMG") {
    
//     //   const fac = new FastAverageColor();
//     //   var bbox = JSON.stringify(node.getBoundingClientRect());

//     //   fac.getColorAsync(node.src).then(color => {
//     //     imageNodes[imageNodesCount] = {node: node.tagName, color: color.hex, bbox: bbox};
//     //     imageNodesCount = imageNodesCount + 1; 
//     //   });
      
//     // }

//     if (isSelectedOneChildNode(node)) {
//       var color = getElementComputedStyleOfProperty(node, 'background-color');
//       var bbox = JSON.stringify(node.getBoundingClientRect());

//       if(node.tagName == "A") {
//         const fac = new FastAverageColor();
//         const imageUrlValue = getElementComputedStyleOfProperty(node, 'background-image');
//         const imageUrl = imageUrlValue.split(/"/)[1];
//         fac.getColorAsync(imageUrl).then(color => {
//           oneChildNodes[oneChildNodesCount] = {node: node.tagName, color: color.hex, bbox: bbox};
//           oneChildNodesCount = oneChildNodesCount + 1;
//         });
//       } else {
            
//         oneChildNodes[oneChildNodesCount] = {node: node.tagName, color:color, bbox: bbox};
//         oneChildNodesCount = oneChildNodesCount + 1;

//       }

//     }

//     for (let i=0; i < node.childNodes.length; i++) {
//       // recursively call to traverse
//       traverse(node.childNodes[i]);
//     }

//   } else if (node.nodeType == Node.TEXT_NODE) {

//     // exclude text node consisting of only spaces
//     if (node.nodeValue.trim() == "") {
//       return;
//     }

//     var color = getElementComputedStyleOfProperty(node.parentElement, 'color');
//     var bboxes;
//     if(node.parentElement.tagName == "A") {
//       bboxes = node.parentElement.getClientRects();
//     } else {
//       auxTextNodeRange.selectNodeContents(node);
//       bboxes = auxTextNodeRange.getClientRects();  
//     }

//     for(let i=0; i<bboxes.length; i++) {
//       textNodes[textNodesCount]={text: node.nodeValue.trim(), color: color, bbox: JSON.stringify(bboxes[i])}; 
//       textNodesCount+=1;
//     }      

//   }
// }

//     // function extractOneChildNodes() {
//     //   return oneChildNodes;
//     // }


// async function createBox(node) {

//   var color, bbox;
//   var nodes = [];

//   if(node.nodeType == Node.TEXT_NODE) {
//     color = getElementComputedStyleOfProperty(node.parentElement, 'color');

//     if(node.parentElement.tagName == "A") {
//       bbox = node.parentElement.getClientRects();
//     } else {
//       auxTextNodeRange.selectNodeContents(node);
//       bbox = auxTextNodeRange.getClientRects();  
//     }

//     for(let i=0; i < bbox.length; i++) {
//       nodes.push({text: node.nodeValue.trim(), color: color, bbox: JSON.stringify(bbox[i])});
//     }      

//   } else if(node.nodeType == Node.ELEMENT_NODE) {
//     color = getElementComputedStyleOfProperty(node, 'background-color');
//     bbox = JSON.stringify(node.getBoundingClientRect());
    
//     if(node.tagName == "A") {
//       const fac = new FastAverageColor();
//       const imageUrlValue = getElementComputedStyleOfProperty(node, 'background-image');
//       const imageUrl = imageUrlValue.split(/"/)[1];
//       await fac.getColorAsync(imageUrl).then(color => {
//         nodes.push({node: node.tagName, color: color.hex, bbox: bbox});
//       });
//     } else {
//       nodes.push({node: node.tagName, color:color, bbox: bbox});
//     }
//   }

//   return nodes;

// }

// async function extractOneChildNodes() {
//   var oneChildNodes = [];
//   const nodeIterator = document.createNodeIterator(
//     document.body,
//     NodeFilter.SHOW_ELEMENT,
//     (node) => { 
//       if (isSelectedOneChildNode(node)) {
//         return NodeFilter.FILTER_ACCEPT;
//       } else {
//         return NodeFilter.FILTER_REJECT;
//       }
//     } 
//   );

//   var oneChildNode = nodeIterator.nextNode(); 
  
//   while (oneChildNode) {
//     oneChildNodes = oneChildNodes.concat(await createBox(oneChildNode));
//     oneChildNode = nodeIterator.nextNode();
//   }

//   return oneChildNodes;
// }
    

// function extractTextNodes() {
//   var textNodes = [];
//   const nodeIterator = document.createNodeIterator(
//     document.body,
//     NodeFilter.SHOW_TEXT,
//     (node) => { 
//       if(isExcluded(node)) {
//         return NodeFilter.FILTER_REJECT;
//       } else if (isVisible(node)) {
//         return NodeFilter.FILTER_ACCEPT;
//       } else {
//         return NodeFilter.FILTER_SKIP; 
//       }
//     } 
//   );
  
//   var textNode = nodeIterator.nextNode(); // returns the next node
  
//   while (textNode) {
//     textNodes = textNodes.concat(createBox(textNode));
//     textNode = nodeIterator.nextNode();
//   }

//   return textNodes;
// }


async function extractImageNodes() {
    var imageNodes = [];
    const fac = new FastAverageColor();
    const images = Array.from(document.querySelectorAll('img')); // getElementsByTagName is probably faster
    const colorPremises = images.map(img => fac.getColorAsync(img.src));
    const colors = await Promise.all(colorPremises);
    const bboxes = images.map(img => JSON.stringify(img.getBoundingClientRect()));
    
    for(i=0; i<images.length; i++) {
        imageNodes[i] = {bbox: bboxes[i], color: colors[i].hex};
    }
    
    return {imageNodes: imageNodes, imagescount: imageNodes.length};
}
    
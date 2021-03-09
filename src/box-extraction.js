/**
 * Project: Box Clustering Segmentation in Node.js
 * Author: Tomas Zubrik, xzubri00@stud.fit.vutbr.cz
 * Year: 2021
 * License:  GNU GPLv3
 * Description: Functions useful for process of box extraction.
 */


 var textNodesCount=0;
 var textNodes=[];
 var imageNodesCount=0;
 var imageNodes=[];
 var oneChildNodesCount = 0;
 var oneChildNodes = [];
 var auxTextNodeRange = document.createRange();
 var allElements = [];



function isVisible(node) {
  if (node.nodeType == Node.ELEMENT_NODE) {
    const bbox = node.getBoundingClientRect();  
    
    // explicitly non-visible
    if (bbox.width == 0 || bbox.height == 0) {
      return false;
    }

    //implicitly non-visible 
    if(node.style.visibility in ["hidden", "collapse"]){
      return false;
    }

    //implicitly non-visible
    if(node.style.display == "none"){
      return false;
    }
  } else if (node.nodeType == Node.TEXT_NODE) {

    if(node.nodeValue.trim() == "") {
      return false;
    }

    return isVisible(node.parentElement);
  }

  return true;
}
    
function isExcluded(node) {

  var excludedTagNames = ["STYLE", "SCRIPT", "NOSCRIPT", "IFRAME", "OBJECT"];

  if(node.nodeType == Node.ELEMENT_NODE){
    return excludedTagNames.includes(node.tagName);
  } else if(node.nodeType == Node.TEXT_NODE) {
    return excludedTagNames.includes(node.parentElement.tagName);
  } else {
    throw "Node type has to be TEXT_NODE|ELEMENT_NODE";
  }

}
   
function isOneChildNode(node) {
  if(node.nodeType == Node.TEXT_NODE) {
      return false;
  }

  if(node.tagName == "IMG") {
    return false;
  }

  // koniec rekurzie - je oneChildNode
  if(node.childElementCount == 0){
    for (let i = 0; i < node.childNodes.length; i++) {
      
      if(node.childNodes[i].nodeValue.trim() != "") {
        return false;
      }
    }
    return true;  
  } 

  // koniec rekurzie - nie je oneChildNode
  if(node.childElementCount > 1) {
      return false;
  }

  return isOneChildNode(node.firstElementChild);
}
    
function containsSmallerBoxWithNontransparentBackgroundOrText(oneChildNode) {

    if(oneChildNode.childElementCount == 1){
        if(hasTransparentBackground(oneChildNode.firstElementChild)) {
            return containsSmallerBoxWithNontransparentBackgroundOrText(oneChildNode.firstElementChild);      
        } else {
            return true;
        }
    }

    if(oneChildNode.hasChildNodes()) {
      for (let i = 0; i < oneChildNode.childNodes.length; i++) {

        // one child node contains text node
        if(oneChildNode.childNodes[i].data.trim() != "") {
          return true;
        }
        
      }
    }
      
    return false;
}
    
function hasOneChildParentWithNontransparentBackground(oneChildNode) {
    if(oneChildNode.parentElement.childElementCount > 1) {
        return false;
    }

    if(hasTransparentBackground(oneChildNode.parentElement)) {
        return hasOneChildParentWithNontransparentBackground(oneChildNode.parentElement);
    }

    return true;
}
    
    // TODO: Pozor!, v hlavnom cykle traverse ak najdem node, ktory je selected, dalej (hlbsie v strome) nepokracujem!
    // odpada kontrola listoveho uzla
function isSelectedOneChildNode(oneChildNode) {
  
  if(!isVisible(oneChildNode)) {
    return false;
  }


  if(!isOneChildNode(oneChildNode)) {
    return false;
  }

  if(containsSmallerBoxWithNontransparentBackgroundOrText(oneChildNode)) {
      return false;
  } else {
    // oneChildNode s potomkom
    if(oneChildNode.childElementCount == 1){
        return !hasTransparentBackground(oneChildNode);
      
    // leaf, mozno nemusim riesit - problem s pripadom, kedy su vsetky parentske oneChildNody bez pozadia
    } else {
        if(hasTransparentBackground(oneChildNode)) {
            
            if(hasOneChildParentWithNontransparentBackground(oneChildNode)) {
                return false;
            } else {
                return true;
            }
        } else {
            return false;
        }
    }
    
  }
}
    
 
function traverse(node) {
  if (node.nodeType == Node.ELEMENT_NODE || node.nodeType == Node.DOCUMENT_NODE) {

    // exclude elements with invisible text nodes
    if (isExcluded(node)) {
      return
    }

    // if(node.tagName == "IMG") {
    
    //   const fac = new FastAverageColor();
    //   var bbox = JSON.stringify(node.getBoundingClientRect());

    //   fac.getColorAsync(node.src).then(color => {
    //     imageNodes[imageNodesCount] = {node: node.tagName, color: color.hex, bbox: bbox};
    //     imageNodesCount = imageNodesCount + 1; 
    //   });
      
    // }

    if (isSelectedOneChildNode(node)) {
      var color = getElementComputedStyleOfProperty(node, 'background-color');
      var bbox = JSON.stringify(node.getBoundingClientRect());

      if(node.tagName == "A") {
        const fac = new FastAverageColor();
        const imageUrlValue = getElementComputedStyleOfProperty(node, 'background-image');
        const imageUrl = imageUrlValue.split(/"/)[1];
        fac.getColorAsync(imageUrl).then(color => {
          oneChildNodes[oneChildNodesCount] = {node: node.tagName, color: color.hex, bbox: bbox};
          oneChildNodesCount = oneChildNodesCount + 1;
        });
      } else {
            
        oneChildNodes[oneChildNodesCount] = {node: node.tagName, color:color, bbox: bbox};
        oneChildNodesCount = oneChildNodesCount + 1;

      }

    }

    for (let i=0; i < node.childNodes.length; i++) {
      // recursively call to traverse
      traverse(node.childNodes[i]);
    }

  } else if (node.nodeType == Node.TEXT_NODE) {

    // exclude text node consisting of only spaces
    if (node.nodeValue.trim() == "") {
      return;
    }

    var color = getElementComputedStyleOfProperty(node.parentElement, 'color');
    var bboxes;
    if(node.parentElement.tagName == "A") {
      bboxes = node.parentElement.getClientRects();
    } else {
      auxTextNodeRange.selectNodeContents(node);
      bboxes = auxTextNodeRange.getClientRects();  
    }

    for(let i=0; i<bboxes.length; i++) {
      textNodes[textNodesCount]={text: node.nodeValue.trim(), color: color, bbox: JSON.stringify(bboxes[i])}; 
      textNodesCount+=1;
    }      

  }
}

    // function extractOneChildNodes() {
    //   return oneChildNodes;
    // }


function createBox(node) {

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

    return nodes;
  }

}
    

function extractTextNodes() {
  var textNodes = [];
  const nodeIterator = document.createNodeIterator(
    document.body,
    NodeFilter.SHOW_TEXT,
    (node) => { 
      if(isExcluded(node)) {
        return NodeFilter.FILTER_REJECT;
      } else if (isVisible(node)) {
        return NodeFilter.FILTER_ACCEPT;
      } else {
        return NodeFilter.FILTER_SKIP; 
      }
    } 
  );
  
  var textNode = nodeIterator.nextNode(); // returns the next node
  
  while (textNode) {
    textNodes = textNodes.concat(createBox(textNode));
    textNode = nodeIterator.nextNode();
  }

  return textNodes;
}


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
    
    return imageNodes;
}
    


    function getStyleByProperty(element, property) {
        return window.getComputedStyle(element, null).getPropertyValue(property);
    }
    
    function isVisible(elm) {
      if (elm.nodeType == Node.ELEMENT_NODE) {
        const bbox = elm.getBoundingClientRect();  
        //explicitly non-visible
        // if (bbox.width == 0 || bbox.height == 0) {
        //   return false;
        // }
    
        //implicitly non-visible (all html elements)
        if(elm.style.visibility == "hidden"){
          return false;
        }
    
        //implicitly non-visible (table elements)
        if(elm.style.visibility == "collapse"){
          return false;
        }
    
        //implicitly non-visible
        if(elm.style.display == "none"){
          return false;
        }
      } else if (elm.nodeType == Node.TEXT_NODE) {
        return isVisible(elm.parentElement);
      }
    
      return true;
    }
    
    function isExcluded(elm) {
      if (elm.tagName == "STYLE") {
        return true;
      }
      if (elm.tagName == "SCRIPT") {
        return true;
      }
      if (elm.tagName == "NOSCRIPT") {
        return true;
      }
      if (elm.tagName == "IFRAME") {
        return true;
      }
      if (elm.tagName == "OBJECT") {
        return true;
      }
    
      if(!isVisible(elm)){
        return true;
      }
      return false
    }
    
    var elementsCount=0;
    var elements=[];
    var range = document.createRange();
    
    function traverse(elm) {
      if (elm.nodeType == Node.ELEMENT_NODE || elm.nodeType == Node.DOCUMENT_NODE) {
    
        // exclude elements with invisible text nodes
        if (isExcluded(elm)) {
          return
        }
    
        for (var i=0; i < elm.childNodes.length; i++) {
          // recursively call to traverse
          traverse(elm.childNodes[i]);
        }
    
      }
    
      if (elm.nodeType == Node.TEXT_NODE) {
    
        // exclude text node consisting of only spaces
        // if (elm.nodeValue.trim() == "") {
        //   return
        // }
    
        // elm.nodeValue here is visible text we need.
        
        var color = getStyleByProperty(elm.parentElement, 'color');
        range.selectNodeContents(elm);
        // var bbox = JSON.stringify(range.getBoundingClientRect());
        var bboxes = range.getClientRects();
    
        for(i=0; i<bboxes.length; i++) {
    
          elements[elementsCount]={element:elm.data, color:color, bbox:JSON.stringify(bboxes[i])}; 
          elementsCount+=1;
    
        }      
      }
    }

    function extractTextNodes(document) {
        traverse(document);
        return elements;
    }

    async function extractImageNodes(document) {

        const fac = new FastAverageColor();
        const images = Array.from(document.querySelectorAll('img'));
        const imageColorPremises = images.map(img => fac.getColorAsync(img.src));
        const imageColors = await Promise.all(imageColorPremises);
        const imageNodes = [];
        
        for(i=0; i<images.length; i++) {
            imageNodes[i] = {bbox:JSON.stringify(images[i].getBoundingClientRect()), color: imageColors[i].hex};
        }
        
        return imageNodes;
    }
    
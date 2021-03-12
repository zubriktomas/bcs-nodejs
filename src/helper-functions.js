/**
 * Get computed style of HTML Element
 * @param {HTML Element} element 
 * @returns 
 */
function getStyle(element) { 
  return element.currentStyle || window.getComputedStyle(element, false);
}

function assert(condition, message) {
  if (!condition){
    throw Error('Assert failed: ' + (message || ''));
  }
}
function getElementComputedStyleOfProperty(element, property) {
  return window.getComputedStyle(element, null).getPropertyValue(property);
}

function hasTransparentBackground(element) {
  if(getElementComputedStyleOfProperty(element, 'background-color') === 'rgba(0, 0, 0, 0)') {
      return true;
  } else {
      return false;
  }
}
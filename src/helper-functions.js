function getStyleByProperty(element, property) {
    return window.getComputedStyle(element, null).getPropertyValue(property);
}

function getBCSInfo(element) {
  var color = getStyleByProperty(element, 'color');
  var bgcolor = getStyleByProperty(element, 'background-color');
  var bbox = JSON.stringify(element.getBoundingClientRect());
  return {bbox:bbox, bgcolor:bgcolor, color:color};
}
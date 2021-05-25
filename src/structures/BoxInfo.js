 /**
 * Project: Box Clustering Segmentation in Node.js
 * Author: Tomas Zubrik, xzubri00@stud.fit.vutbr.cz
 * Year: 2021
 * Description: BoxInfo - basic extraction information for given box
 */

/**
 * BoxInfo - basic extraction information for given box
 */
 class BoxInfo {
    /**
     * Create BoxInfo from bounding box and color
     * @param {DOMRect} bbox 
     * @param {string} color 
     */
  
    constructor(bbox, color) {
      this.left = bbox.left;
      this.right = bbox.right;
      this.top = bbox.top;
      this.bottom = bbox.bottom;
      this.width = bbox.width;
      this.height = bbox.height;
      this.color = color;
      this.id = `(t:${this.top},l:${this.left},b:${this.bottom},r:${this.right},c:${this.color})`;
      this.type = 0;
    }
}
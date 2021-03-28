
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
      this.left = bbox.left;
      this.right = bbox.right;
      this.top = bbox.top;
      this.bottom = bbox.bottom;
      this.width = bbox.width;
      this.height = bbox.height;
      this.color = color;

      this.id = `(t: ${this.top}, l:${this.left}, b:${this.bottom}, r:${this.right}, c:${this.color})`;
      this.type = 'box';
      
      this.maxNeighbourDistance = 0;
      this.neighbours = {};
      this.relations = {};
    }

   
}
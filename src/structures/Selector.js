/* Selector Direction Enum JavaScript best practice */
const SelectorDirection = Object.freeze({
    right: 'right', 
    down: 'down', 
    left: 'left', 
    up: 'up',
    other: 'other'
});

class Selector {
    constructor(minX, minY, maxX, maxY) {
        this.minX = minX;
        this.minY = minY;
        this.maxX = maxX;
        this.maxY = maxY;
    }

    narrowBy1Px() {
        this.minX += 1;
        this.minY += 1;
        this.maxX -= 1;
        this.maxY -= 1;
        return this;
    }
}

module.exports = {Selector, SelectorDirection};
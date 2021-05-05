 /**
 * Project: Box Clustering Segmentation in Node.js
 * Author: Tomas Zubrik, xzubri00@stud.fit.vutbr.cz
 * Year: 2021
 * License:  GNU GPLv3
 * Description: Functions useful for process of node extraction.
 */

const { SelectorDirection } = require('../structures/Selector');
const {EntityType, isBox, isCluster} = require('./EntityType');

/**
 * Constants
 */
const SQRT3 = Math.sqrt(3);

/**
 * Relation Structure to specify relation (similarity) between 2 entities
 */
class Relation {

    /**
     * Create relation between entities in some direction 
     * @param {(Cluster|Box)} entityA 
     * @param {(Cluster|Box)} entityB 
     * @param {SelectorDirection} direction Optional (if it is not specified, it is calculated)
     */
    constructor(entityA, entityB, direction) {

        /* Basic info */
        this.entityA = entityA;
        this.entityB = entityB;
        this.direction = direction || this.calcDirection(entityA, entityB);
        this.id = this.generateId(entityA, entityB);

        /* Absolute distance calculated immediately */
        this.absoluteDistance = this.calcAbsoluteDistance(entityA, entityB);

        /* Similarity calculated on demand */
        this.similarity = null;

        // this.relativeDistance = null;
        // this.shapeSimilarity = null;
        // this.colorSimilarity = null;
    }

    /**
     * Generate ID of relation from entities IDs and direction
     * @param {(Cluster|Box)} entityA 
     * @param {(Cluster|Box)} entityB 
     * @returns Relation ID
     */
    generateId(entityA, entityB) {
        if(isCluster(entityA) || isCluster(entityB)) {
            return entityA.id + entityB.id;
        }
        if(this.direction == SelectorDirection.right || this.direction == SelectorDirection.down) {
            return entityA.id + entityB.id;
        } else if(this.direction == SelectorDirection.left || this.direction == SelectorDirection.up) {
            return entityB.id + entityA.id;
        } else {
            return null;
        }
    }

    /**
     * Calculate projected overlap between entities
     * @param {(Cluster|Box)} a 
     * @param {(Cluster|Box)} b 
     * @returns Projected overlap (x|y)
     */
    calcProjectedOverlap(a, b) {
        var condX = a.right >= b.left && a.left <= b.right;
        var condY = a.bottom >= b.top && a.top <= b.bottom;
        var condHaveEdgeX = a.right == b.left || a.left == b.right;

        if(condX) {
            return (condHaveEdgeX) ? 'y' : 'x';
        } else if (condY) {
            return 'y';
        } else {
            return 'o';
        }
    }

    /**
     * Calculate direction between entities (a -> b)
     * @param {(Cluster|Box)} a 
     * @param {(Cluster|Box)} b 
     * @returns SelectorDirection (down|up|right|left|other)
     */
    calcDirection(a, b) {
        var pov = this.calcProjectedOverlap(a,b);

        if(a.bottom <= b.top && pov == 'x') {
            return SelectorDirection.down; /* it is reversed according to paper, because we want position of selector */
        } else if (a.top >= b.bottom && pov == 'x') {
            return SelectorDirection.up;
        } else if (a.right <= b.left && pov == 'y') {
            return SelectorDirection.right;
        } else if (a.left >= b.right && pov == 'y') {
            return SelectorDirection.left;
        } else {
            return SelectorDirection.other;
        }
    }

    /**
     * Calculate absolute distance between entities
     * @param {(Cluster|Box)} entityA 
     * @param {(Cluster|Box)} entityB 
     * @returns Absolute distance between entities
     */
    calcAbsoluteDistance(entityA, entityB) {
        var absoluteDistance;
        if(this.direction == SelectorDirection.right) {
            absoluteDistance = entityB.left - entityA.right;
        } else if (this.direction == SelectorDirection.down) {
            absoluteDistance = entityB.top - entityA.bottom;
        } else if (this.direction == SelectorDirection.left) {
            absoluteDistance = entityA.left - entityB.right;
        } else if (this.direction == SelectorDirection.up) {
            absoluteDistance = entityA.top - entityB.bottom;
        } else {
            absoluteDistance = Infinity;
        }
        return absoluteDistance;
    }

    /**
     * Calculate relative distance between boxes
     * @param {Box} boxA 
     * @param {Box} boxB
     * @returns Relative distance between boxes
     */
    calcRelativeDistance(boxA, boxB) {
        var relA, relB, maxdA, maxdB;

        maxdA = boxA.maxNeighbourDistance;
        maxdB = boxB.maxNeighbourDistance;

        relA = this.absoluteDistance / maxdA;
        relB = this.absoluteDistance / maxdB;

        this.relativeDistance = (relA + relB) / 2;

        return (relA + relB) / 2;
    }

    /**
     * Calculate shape similarity between boxes
     * @param {Box} boxA 
     * @param {Box} boxB
     * @returns Shape similarity between boxes
     */
    calcShapeSimilarity(boxA, boxB) {
        /* Variables for calculation ratio and size similarity */
        var widthA, heightA, widthB, heightB;

        /* Variables for calculation ratio similarity */
        var ratioA,  ratioB,  ratio, maxRatio, minRatio;

        widthA = boxA.width;
        heightA = boxA.height;
        widthB = boxB.width;
        heightB = boxB.height;

        ratioA = widthA / heightA;
        ratioB = widthB / heightB;

        maxRatio = Math.max(ratioA, ratioB);
        minRatio = Math.min(ratioA, ratioB);

        var pom = (Math.pow(maxRatio, 2) - 1);
        /* TODO: 1 or 0.001 */
        ratio = (maxRatio - minRatio) / ( pom?pom:0.001 / maxRatio );

        // ratioA = Math.abs(Math.log(widthA) - Math.log(heightA));
        // ratioB = Math.abs(Math.log(widthB) - Math.log(heightB));
        // ratio = Math.abs(ratioA - ratioB);

        /* Variables for calculation size similarity */
        var sizeA, sizeB, size;

        sizeA = widthA * heightA;
        sizeB = widthB * heightB;

        size = 1 - (Math.min(sizeA, sizeB) / Math.max(sizeA, sizeB));

        /* Shape similarity as average of ratio and size */
        var shapeSim = (ratio + size) / 2;
        this.shapeSimilarity = shapeSim;
        return shapeSim;
    }

    /**
     * Calculate color similarity between boxes
     * @param {Box} boxA 
     * @param {Box} boxB
     * @returns Color similarity between boxes
     */
    calcColorSimilarity(boxA, boxB) {
        var colorA, colorB, rPart, gPart, bPart;

        colorA = getRgbFromString(boxA.color);
        colorB = getRgbFromString(boxB.color);

        rPart = Math.pow((colorA.r - colorB.r) / 255, 2);
        gPart = Math.pow((colorA.g - colorB.g) / 255, 2);
        bPart = Math.pow((colorA.b - colorB.b) / 255, 2);

        var colorSim = Math.sqrt(rPart + gPart + bPart) / SQRT3;

        this.colorSimilarity = colorSim;
        return colorSim;
    }

    /**
     * Calculate base similarity between boxes
     * @param {Box} boxA 
     * @param {Box} boxB
     * @returns Base similarity between boxes
     */
    calcBaseSimilarity(boxA, boxB) {
        var relativeDistance = this.calcRelativeDistance(boxA, boxB);

        /* Boxes are aligned next to each other (share edge) */
        if(relativeDistance <= 0) {
            return 0;
        } else if (relativeDistance == 1) {
            this.calcShapeSimilarity(boxA, boxB);
            this.calcColorSimilarity(boxA, boxB);
            return 1;
        } else {
            var relDist = relativeDistance;
            var shapeSim = this.calcShapeSimilarity(boxA, boxB);
            var colorSim = this.calcColorSimilarity(boxA, boxB);
            // var sim = (relDist*0.2 + shapeSim*0.25 + colorSim*0.1) / 3;
            // var sim = (relDist*ONETHIRD + shapeSim*ONETHIRD + colorSim*ONETHIRD) / 3;
            var sim = (relDist + shapeSim + colorSim) / 3;
            return sim;
            // return sim <= 1 ? sim : 1;
        }
    }

    /**
     * Calculate similarity between relation entities (bb, bc, cb, cc)
     */
    calcSimilarity() {
        var entityA = this.entityA;
        var entityB = this.entityB;

        if(isBox(entityA) && isBox(entityB)) {
            this.similarity = this.calcBaseSimilarity(entityA, entityB);
        } else {
            this.similarity = this.calcClusterSimilarity(entityA, entityB);
        }
    }
    
    /**
     * Calculate cluster similarity between entities (at least one entity has to be Cluster)
     * @param {(Cluster|Box)} entityA 
     * @param {(Cluster|Box)} entityB 
     * @returns Cluster similarity
     */
    calcClusterSimilarity(entityA, entityB) {

        if(isCluster(entityA)) {
            return (this.calcCumulSimilarity(entityA, entityB) / this.calcCardinality(entityA, entityB));
        }
        
        if(isCluster(entityB)) {
            return (this.calcCumulSimilarity(entityB, entityA) / this.calcCardinality(entityB, entityA));
        }
        //     console.log(`eA: ${entityA.id}, eB: ${entityB.id}`);
        //     console.log(`${this.calcCumulSimilarity(entityA, entityB)} / ${this.calcCardinality(entityA, entityB)}`);
        // console.log(`${this.calcCumulSimilarity(entityB, entityA)} / ${this.calcCardinality(entityB, entityA)}`);
    }

    /**
     * Calculate relation cardinality between cluster and entity
     * @param {Cluster} cluster
     * @param {(Cluster|Box)} entity
     * @returns Relation cardinality
     */
    calcCardinality(cluster, entity, direction) {

        var card = 0;

        if(isBox(entity)) {
            for (const cBox of cluster.boxes.values()) {
                if(direction == "BACK" && entity.neighbours.has(cBox)) {
                    card++;
                } else if (!direction && cBox.neighbours.has(entity)){
                    card++;
                }
            }
        } else {
            for (const cBox of cluster.boxes.values()) {
                for (const eBox of entity.boxes.values()) {
                    /* Add cardinality only if relation is two directional */
                    if(direction == "BACK" && eBox.neighbours.has(cBox)){
                        card++;
                    } else if(!direction && cBox.neighbours.has(eBox)) {
                    // if(cBox.neighbours.has(eBox) && eBox.neighbours.has(cBox)) {
                        card++;
                    }
                }
            }
        }

        return card ? card : 1;
    }

    isTwoDirectionalAndProblematic() {
        var entityA = this.entityA;
        var entityB = this.entityB;

        const isTwoDirectional = (a,b) => a.neighbours.has(b) && b.neighbours.has(a);
        const isProblematic = (a, b, relAB, relBA) => isTwoDirectional(a,b) && relAB.similarity == 1 && relBA.similarity == 1;

        // const isCardinalityOneInBothDirections = 

        var isProblematicBool = isProblematic(entityA, entityB, entityA.neighbours.get(entityB), entityB.neighbours.get(entityA));

        return isProblematicBool

        // if(isProblematicBool) {
        //     console.log("problematic relation found");
        // }
    }

    /**
     * Calculate cumulative similarity between cluster and entity
     * @param {Cluster} cluster
     * @param {(Cluster|Box)} entity
     * @returns Cumulative similarity
     */
    calcCumulSimilarity(cluster, entity, direction) {
        var rel, cumulSimilarity = 0;
        if(isBox(entity)) {
            
            for (const cBox of cluster.boxes.values()) {
                if(direction == "BACK") {
                    rel = entity.neighbours.get(cBox);
                } else {
                    rel = cBox.neighbours.get(entity);
                }
                var isTwoDirectional = cBox.neighbours.has(entity) && entity.neighbours.has(cBox);

                var relTwoDirectional;
                if(isTwoDirectional) {

                    // const clusterNextToProblematicEntityId = '(t:740.984375,l:27.1875,b:811.984375,r:71.21875)';
                    // const problematicEntityId = '(t:816.984375,l:27.1875,b:830.984375,r:123.265625,c:rgb(6, 69, 173))';

                    const hasRightNeighbours = (box) => Array.from(box.neighbours.values()).filter(rel => rel.direction == SelectorDirection.left).length;
                    const hasLeftNeighbours = (box) => Array.from(box.neighbours.values()).filter(rel => rel.direction == SelectorDirection.right).length;
                    const hasDownNeighbours = (box) => Array.from(box.neighbours.values()).filter(rel => rel.direction == SelectorDirection.up).length;
                    const hasUpNeighbours = (box) => Array.from(box.neighbours.values()).filter(rel => rel.direction == SelectorDirection.down).length;

                    // if(cluster.id == clusterNextToProblematicEntityId && problematicEntityId == entity.id) {
                    //     console.log(hasRightNeighbours(entity));
                    //     console.log(hasLeftNeighbours(entity));
                    //     console.log(hasDownNeighbours(entity));
                    //     console.log(hasUpNeighbours(entity));

                    // }

                    const hasOnlyUpDownNeighbours = (box) => !hasRightNeighbours(box) && !hasLeftNeighbours(box) && (hasDownNeighbours(box) > 0 || hasUpNeighbours(box) > 0);

                    if(hasOnlyUpDownNeighbours(entity) && hasOnlyUpDownNeighbours(cBox)) {
                        // console.log(entity.id);
                        // console.log(999999);

                        var criticalRelation = cBox.neighbours.get(entity);

                        var trueEntity = entity.cluster ? entity.cluster : entity;

                        var absoluteDistance = criticalRelation.absoluteDistance;
                        var forward = absoluteDistance / cluster.maxNeighbourDistance;
                        var backward = absoluteDistance / trueEntity.maxNeighbourDistance;

                        var relativeDistance = (forward+backward)/2;

                        console.log(criticalRelation.shapeSimilarity);
                        console.log(criticalRelation.colorSimilarity);

                        var shapeSim = criticalRelation.shapeSimilarity != null ? criticalRelation.shapeSimilarity : 1;
                        var colorSim = criticalRelation.colorSimilarity != null ? criticalRelation.colorSimilarity : 1;
                        
                        var sim = (relativeDistance + shapeSim + colorSim)/3;
    
                        console.log(parseFloat(sim.toFixed(3)), parseFloat(criticalRelation.similarity.toFixed(3)));

                        console.log("reldist before:", criticalRelation.relativeDistance);
                        console.log("reldist after:", relativeDistance);

                        cumulSimilarity += sim;
                        continue;

                    }

                    // var rel1 = cBox.neighbours.has(entity);
                    // var rel2 = entity.neighbours.has(cBox);
                    // if(rel1.similarity == 1 && rel2.similarity == 1) {
                    //     relTwoDirectional = rel1;
                    // }
                }

                // var TEST = true;
                // if(relTwoDirectional && TEST) {

                //     console.log("HERE");

                //     var trueEntity = entity.cluster ? entity.cluster : entity;

                //     var absoluteDistance = relTwoDirectional.absoluteDistance;
                //     var forward = absoluteDistance / cluster.maxNeighbourDistance;
                //     var backward = absoluteDistance / trueEntity.maxNeighbourDistance;

                //     var relativeDistance = (forward+backward)/2;
                //     var shapeSim = relTwoDirectional.shapeSimilarity ? relTwoDirectional.shapeSimilarity : 1;
                //     var colorSim = relTwoDirectional.colorSimilarity ? relTwoDirectional.colorSimilarity : 1;
                    
                //     var sim = (relativeDistance + shapeSim + colorSim)/3;

                //     console.log(parseFloat(sim.toFixed(3)), parseFloat(relTwoDirectional.similarity.toFixed(3)));
                    
                //     // if(sim == Infinity) {
                //     //     console.log("infinity");
                //         // console.log(absoluteDistance);
                //         // console.log(relativeDistance);
                //         // console.log(forward);
                //         // console.log(backward);
                //         // console.log(shapeSim);
                //         // console.log(colorSim);
                //     // }

                //     cumulSimilarity += sim;

                //     continue;
                // }
                cumulSimilarity += rel ? rel.similarity : 0;
            }
        } else {
            for (const cBox of cluster.boxes.values()) {
                var sim = (this.calcCumulSimilarity(entity, cBox, "BACK") / this.calcCardinality(entity, cBox, "BACK"));
                cumulSimilarity += sim;
            }
        }
        return cumulSimilarity;
    }
}

/**
 * Get object with RGB components from RGB string (aux. function)
 * @param {string} rgbString Example: rgb(100, 100, 100)
 * @returns RGB object with RGB components
 */
function getRgbFromString(rgbString) {
    var rgbArray, rgb = {}; 

    rgbArray = rgbString.replace(/[^\d,]/g, '').split(',');

    /* RGB components floored to integer values */
    rgb.r = Math.floor(rgbArray[0]);
    rgb.g = Math.floor(rgbArray[1]);
    rgb.b = Math.floor(rgbArray[2]);

    if(rgbArray.length == 4) {
        rgb.a = parseInt(rgbArray[3]);
    }
    return rgb;
}

module.exports = Relation;
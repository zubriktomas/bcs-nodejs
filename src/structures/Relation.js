/**
* Project: Box Clustering Segmentation in Node.js
* Author: Tomas Zubrik, xzubri00@stud.fit.vutbr.cz
* Year: 2021
* License:  GNU GPLv3
* Description: Relation Strucutre for calculating similarity between given entities.
*/

const { SelectorDirection } = require('../structures/Selector');
const { isBox, isCluster } = require('./EntityType');

/**
 * Constants
 */
const SQRT3 = Math.sqrt(3);

/* Direction of cumulative similarity calculation */
const BACK = "BACK";

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
    constructor(entityA, entityB, direction, argv) {

        /* Program arguments */
        this.argv = argv;

        /* Basic info */
        this.entityA = entityA;
        this.entityB = entityB;
        this.direction = direction || this.calcDirection(entityA, entityB);
        this.id = this.generateId(entityA, entityB);

        /* Absolute distance calculated immediately */
        this.absoluteDistance = this.calcAbsoluteDistance(entityA, entityB);

        /* Similarity calculated on demand */
        this.similarity = null;
    }

    /**
     * Generate ID of relation from entities IDs and direction
     * @param {(Cluster|Box)} entityA 
     * @param {(Cluster|Box)} entityB 
     * @returns Relation ID
     */
    generateId(entityA, entityB) {
        if (isCluster(entityA) || isCluster(entityB)) {
            return entityA.id + entityB.id;
        }
        if (this.direction == SelectorDirection.right || this.direction == SelectorDirection.down) {
            return entityA.id + entityB.id;
        } else if (this.direction == SelectorDirection.left || this.direction == SelectorDirection.up) {
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

        if (condX) {
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
        var pov = this.calcProjectedOverlap(a, b);

        if (a.bottom <= b.top && pov == 'x') {
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
        if (this.direction == SelectorDirection.right) {
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
        var ratioA, ratioB, ratio, maxRatio, minRatio;

        widthA = boxA.width;
        heightA = boxA.height;
        widthB = boxB.width;
        heightB = boxB.height;

        ratioA = widthA / heightA;
        ratioB = widthB / heightB;

        maxRatio = Math.max(ratioA, ratioB);
        minRatio = Math.min(ratioA, ratioB);

        /* ! Attention: aux is 0 for relation between square and rectangle with higher height ! Problem of definition */
        var aux = (Math.pow(maxRatio, 2) - 1);

        /* By definition in BCS paper, 'aux' is about to be around zero, so "close" value to zero is used */
        ratio = (maxRatio - minRatio) / (aux ? aux : 1.001 / maxRatio);

        /* Variables for calculation size similarity */
        var sizeA, sizeB, size;

        sizeA = widthA * heightA;
        sizeB = widthB * heightB;

        size = 1 - (Math.min(sizeA, sizeB) / Math.max(sizeA, sizeB));

        /* Shape similarity as average of ratio and size */
        var shapeSim = (ratio + size) / 2;

        /* Problem with ratio calculation above can cause (extreme) exceeding of shapeSim, so it is floored to 1 */
        // shapeSim = shapeSim > 1 ? 1 : shapeSim;

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

        return colorSim;s
    }

    /**
     * Calculate base similarity between boxes
     * @param {Box} boxA 
     * @param {Box} boxB
     * @returns Base similarity between boxes
     */
    calcBaseSimilarity(boxA, boxB) {
        var relativeDistance = this.calcRelativeDistance(boxA, boxB);


        var ascore = this.computeAlignmentScore(boxA, boxB);
        // console.log(ascore);

        /* Boxes are alignmentScore next to each other (share edge), avoid unexpected behaviour by checking if < 0 */
        if (relativeDistance <= 0) {
            return 0;

        /* Avoid unexpected behaviour, floor all similarities to maximum: 1 */
        } else if (relativeDistance > 1) {

            // console.log(relativeDistance);

            /* For extended implementation, shapeSimilarity and colorSimilartiy has to be accessible from Relation class */
            // if(this.argv.extended){
                // this.shapeSimilarity = this.calcShapeSimilarity(boxA, boxB);
                // this.colorSimilarity = this.calcColorSimilarity(boxA, boxB);

            //     var relDist = relativeDistance;
            //     var shapeSim = this.calcShapeSimilarity(boxA, boxB);
            //     var colorSim = this.calcColorSimilarity(boxA, boxB);
            //     return (relDist + shapeSim + colorSim)/3;

            // }
            return 1;

        } else {
            /* Calculate all components of similarity */
            var relDist = relativeDistance;
            var shapeSim = this.calcShapeSimilarity(boxA, boxB);
            var colorSim = this.calcColorSimilarity(boxA, boxB);

            /* Weight vector for calculating similarity, allow more customization and testing */
            var w = this.argv.WVEC;

            /* Calculate base similarity between boxes */
            // var sim = (relDist * w[0] + shapeSim * w[1] + colorSim * w[2]) / 3;
            var sim = (shapeSim + colorSim + relDist)/(ascore > 1 ? ascore*2 : 3);

            return sim;
        }
    }

    /**
     * Calculate similarity between relation entities (bb, bc, cb, cc)
     */
    calcSimilarity() {
        var entityA = this.entityA;
        var entityB = this.entityB;

        if (isBox(entityA) && isBox(entityB)) {
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

        if (isCluster(entityA)) {
            return (this.calcCumulSimilarity(entityA, entityB) / this.calcCardinality(entityA, entityB));
        }

        if (isCluster(entityB)) {
            return (this.calcCumulSimilarity(entityB, entityA) / this.calcCardinality(entityB, entityA));
        }
    }

    /**
     * Calculate relation cardinality between cluster and entity
     * @param {Cluster} cluster
     * @param {(Cluster|Box)} entity
     * @returns Relation cardinality
     */
    calcCardinality(cluster, entity, direction) {

        var card = 0;

        if (isBox(entity)) {
            
            for (const cBox of cluster.boxes.values()) {
                /* Increment cardinality in backward direction */
                if (direction == BACK && entity.neighbours.has(cBox)) {
                    card++;
                /* If direction is not specified, it means forward direction */
                } else if (!direction && cBox.neighbours.has(entity)) {
                    card++;
                }
            }
        } else {
            /* Calculate cardinality by BCS definition */ 
            for (const cBox of cluster.boxes.values()) {
                for (const eBox of entity.boxes.values()) {
                    /* Increment cardinality only if some box in cluster has direct neighbour box from another cluster */
                    if (cBox.neighbours.has(eBox)) {
                        card++;
                    }
                }
            }
        }

        return card ? card : 1;
    }

    /**
     * Calculate cumulative similarity between cluster and entity
     * @param {Cluster} cluster
     * @param {(Cluster|Box)} entity
     * @returns Cumulative similarity
     */
    calcCumulSimilarity(cluster, entity, direction) {
        var rel, cumulSimilarity = 0;
        if (isBox(entity)) {

            for (const cBox of cluster.boxes.values()) {
                if (direction == BACK) {
                    rel = entity.neighbours.get(cBox);
                } else {
                    rel = cBox.neighbours.get(entity);
                }

                cumulSimilarity += rel ? rel.similarity : 0;
            }
        } else {
            for (const cBox of cluster.boxes.values()) {
                /* Calculate backward cumulative similarity, treat differently, because not all relations are two directional 
                 * It means that boxA can have other boxB as direct neighbour, but boxB need not have boxA as neighbour */
                var sim = (this.calcCumulSimilarity(entity, cBox, BACK) / this.calcCardinality(entity, cBox, BACK));
                cumulSimilarity += sim;
            }
        }
        return cumulSimilarity;
    }

    computeAlignmentScore(boxA, boxB) {

        /* Enum Alignemnt */
        const Alignment = Object.freeze({ left:0, top:1, right:2, bottom:3, none:4 });

        /* Get side alignment between two boxes */
        const getSideAlignment = (a, b) => { 
            if(a.left == b.left) return Alignment.left;
            else if(a.top == b.top) return Alignment.top;
            else if(a.right == b.right) return Alignment.right; 
            else if(a.bottom == b.bottom) return Alignment.bottom;
            else return Alignment.none;
        };

        /* Check if relation is vertical (down, up direction) */
        const hasVerticalDirection = (rel) => rel.direction == SelectorDirection.down || rel.direction == SelectorDirection.up;

        /* Check if relation is horizontal (left, right direction) */
        const hasHorizontalDirection = (rel) => rel.direction == SelectorDirection.left || rel.direction == SelectorDirection.right;
        
        /* Variables */
        var alignmentScore = 1;
        var queue = new Set();
        var inspected = new Set();
        var cur;

        /* Get alignment if any */
        const alignment = getSideAlignment(boxA, boxB);

        /* This coeficient determines how sensitively is alignment treated */
        const alignmentThresholdCoeficient = 1.5; // this value was used in reference FitLayout implementation

        /* Get (total) minimum of heights and widths of boxes */
        const minDimensionBoxA = Math.min(boxA.width, boxA.height);
        const minDimensionBoxB = Math.min(boxB.width, boxB.height);
        const minimumTotal = Math.min(minDimensionBoxA, minDimensionBoxB);
        const alignmentThreshold = Math.floor(minimumTotal * alignmentThresholdCoeficient);


        /* If they are not side aligned or distance between exceeds threshold */
        if (alignment == Alignment.none || this.absoluteDistance > alignmentThreshold){
            return alignmentScore;
        } else {
            alignmentScore++;
        }

        /* Add both boxes to queue */
        queue.add(boxA);
        queue.add(boxB);

        /* Get next value from queue if it is not empty */
        while (queue.size > 0) {

            cur = queue.values().next().value;
            queue.delete(cur);
            
            /* Skip already processed box */
            if (inspected.has(cur)) continue;

            /* Loop over all current box neighbours */
            for (const [box, rel] of cur.neighbours.entries()) {

                if ( (hasHorizontalDirection(rel) && hasVerticalDirection(this)) || inspected.has(box) || queue.has(box) ||
                    getSideAlignment(cur, box) != alignment || rel.absoluteDistance > alignmentThreshold) {
                    continue;
                }

                /* If it pass previous condition, it is considered as side aligned, so increase alignment score */
                alignmentScore++;

                /* And add box into queue */
                queue.add(box);
            }

            /* Add current box to inspected set to skip it next time it would be chosen */
            inspected.add(cur);
        }
        return alignmentScore;
    }
}

/**
 * Get object with RGB components from RGB string (aux. function)
 * @param {string} rgbString Example: "rgb(100, 100, 100)"
 * @returns RGB object with RGB components
 */
function getRgbFromString(rgbString) {
    var rgbArray, rgb = {};

    rgbArray = rgbString.replace(/[^\d,]/g, '').split(',');

    /* RGB components floored to integer values */
    rgb.r = Math.floor(rgbArray[0]);
    rgb.g = Math.floor(rgbArray[1]);
    rgb.b = Math.floor(rgbArray[2]);

    if (rgbArray.length == 4) {
        rgb.a = parseInt(rgbArray[3]);
    }
    return rgb;
}

module.exports = Relation;
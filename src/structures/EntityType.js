/**
 * Project: Box Clustering Segmentation in Node.js
 * Author: Tomas Zubrik, xzubri00@stud.fit.vutbr.cz
 * Year: 2021
 * License:  GNU GPLv3
 * Description: EntityType enum and type check functions
 */

/**
 * Enum EntityType
 */
const EntityType = Object.freeze({box: 0, cluster: 1});

/**
 * Check if entity is Cluster
 * @param {(Cluster|Box)} entity 
 * @returns true|false
 */
function isCluster(entity) {
    return entity.type == EntityType.cluster;
}

/**
 * Check if entity is Box
 * @param {(Cluster|Box)} entity 
 * @returns true|false
 */
function isBox(entity) {
    return entity.type == EntityType.box;
}

module.exports = {EntityType, isCluster, isBox};
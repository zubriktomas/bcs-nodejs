
const EntityType = Object.freeze({box: 0, cluster: 1});

function isCluster(entity) {
    return entity.type == EntityType.cluster;
}

function isBox(entity) {
    return entity.type == EntityType.box;
}

module.exports = {EntityType, isCluster, isBox};
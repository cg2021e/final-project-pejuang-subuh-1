import * as THREE from './three.module.js';

/**
 * 
 * @param {Array.<THREE.Mesh[]>} map 
 * @param {THREE.Vector3} position 
 * @returns {THREE.Mesh}
 */
export const getAt = (map, position) => {
    const x = Math.round(position.x);
    const y = Math.round(position.y);

    if (map[y] && map[y][x]) {
        return map[y][x];
    }

    return null;
}

/**
 * 
 * @param {Array.<THREE.Mesh[]>} map 
 * @param {THREE.Vector3} position 
 * @returns {boolean}
 */
export const checkPassable = function (map, position) {
    const mesh = getAt(map, position);

    if (mesh) {
        return mesh.isPassable;
    }
    return false;
}

/**
 * 
 * @param {Array.<THREE.Mesh[]>} map 
 * @param {THREE.Vector3} position 
 * @param {Number} playerRadius
 * @returns {boolean}
 */
export const checkGoal = (map, position, playerRadius) => position.distanceToSquared(map.goal) < playerRadius * playerRadius / 2;

/**
 * 
 * @param {Array.<THREE.Mesh[]>} map 
 * @param {THREE.Vector3} position 
 * @param {Number} playerRadius
 * @returns {boolean}
 */
export const checkPowerUp = function (map, position, playerRadius) {
    const mesh = getAt(map, position);

    if (mesh && mesh.isPowerUp) {
        return position.distanceToSquared(mesh.position) < playerRadius * playerRadius / 2;
    }

    return false;
}

export const checkEnergyPill = (map, position, playerRadius) => {
    const mesh = getAt(map, position);

    if (mesh && mesh.isEnergy) {
        return position.distanceToSquared(mesh.position) < playerRadius * playerRadius / 2;
    }

    return false;
}
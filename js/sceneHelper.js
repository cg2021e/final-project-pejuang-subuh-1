import * as THREE from './three.module.js';
import { ColladaLoader } from './ColladaLoader.js';
import { MAP_DEFINITION } from './map.js';

/**
 * 
 * @param {THREE.Vector3} position 
 * @returns {THREE.Mesh}
 */
export const createWall = function (position, textures) {
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshPhongMaterial({ 
        map: textures,
    });
    const wall = new THREE.Mesh(geometry, material);
    
    wall.position.copy(position);
    wall.castShadow = true;
    wall.receiveShadow = true;

    wall.isPassable = false;

    return wall;
}

/**
 * 
 * @param {THREE.Scene} scene 
 * @param {string} mapDifficulty 
 * @param {Number} playerRadius 
 * @returns {Array.<THREE.Mesh[]>}
 */
export const createMap = function (scene, mapDifficulty, playerRadius, mapIndex) {
    const mapDefs = MAP_DEFINITION[mapDifficulty];
    const randIndex = mapIndex || Math.floor(Math.random() * mapDefs.length);
    const mapDef = mapDefs[randIndex];

    const mapString = mapDef.map;
    const mapHeight = mapDef.map.length;
    const mapWidth = mapDef.map[0].length;

    const map = {
        difficulty: mapDifficulty,
        mapIndex: randIndex,
        top: 0,
        bottom: mapHeight - 1,
        left: 0,
        right: mapWidth - 1,
        playerSpawn: new THREE.Vector3(mapDef.start[0], -mapDef.start[1], 0),
        goal: new THREE.Vector3(mapDef.goal[0], -mapDef.goal[1], 0),
    };

    const loader = new THREE.TextureLoader();
    const wallTexture = loader.load('textures/Stylized_Bricks_001_basecolor.jpg');
    const groundTexture = loader.load('textures/Dirt_006_Base Color.jpg');
    groundTexture.wrapS = THREE.MirroredRepeatWrapping;
    groundTexture.wrapT = THREE.MirroredRepeatWrapping;
    groundTexture.repeat.set(mapWidth, mapHeight);

    for (let i = 0; i < mapHeight; i++) {
        const y = -i;
        map[y] = {};
        for (let j = 0; j < mapWidth; j++) {
            const x = j;

            let mesh = null;

            if (map.playerSpawn.equals(new THREE.Vector3(x, y, 0))) {
                map[y][x] = {
                    'isPassable': true
                };
            } else if (map.goal.equals(new THREE.Vector3(x, y, 0))) {
                mesh = createGoal(new THREE.Vector3(x, y, 0), playerRadius / 2);
                mesh.isPassable = true;
            }

            const mapNow = mapString[i][j];

            switch (mapNow) {
                case '#':
                    mesh = createWall(new THREE.Vector3(x, y, 0), wallTexture);
                    break;

                case '+':
                    mesh = createPowerUp(new THREE.Vector3(x, y, 0), playerRadius / 4);
                    mesh.isPassable = true;
                    mesh.isPowerUp = true;
                    break;

                case '$':
                    mesh = createEnergyPill(new THREE.Vector3(x, y, 0), playerRadius / 4);
                    mesh.isPassable = true;
                    mesh.isEnergy = true;
                    break;

                default:
                    map[y][x] = {
                        'isPassable': true
                    };
                    break;
            }

            if (mesh != null) {
                map[y][x] = mesh;
                scene.add(mesh);
            }
        }
    }

    const centerX = mapWidth / 2;
    const centerY = -mapHeight / 2;

    const planeGeo = new THREE.PlaneGeometry(mapWidth, mapHeight);
    const planeMat = new THREE.MeshPhongMaterial({
        color: 0x888888,
        map: groundTexture,
    });
    const planeMesh = new THREE.Mesh(planeGeo, planeMat);
    planeMesh.receiveShadow = true;
    planeMesh.position.set(centerX - 0.5, centerY + 0.5, -0.5);
    scene.add(planeMesh);

    const lightHeight = centerX;
    addPointLight(scene, 0xFFFFFF, 0.8, new THREE.Vector3(centerX, centerY, lightHeight));

    return map;
};

/**
 * 
 * @param {THREE.Scene} scene 
 * @param {THREE.Vector3} position 
 * @param {Number} playerRadius 
 * @returns {THREE.Mesh}
 */
export const createPlayer = function (scene, position, callback) {
    let player = null;

    const colladaLoader = new ColladaLoader();
    colladaLoader.load("model/player.dae", function (result) {
        player = result.scene;
        player.distanceMoved = 0;

        player.scale.x = player.scale.y = player.scale.z = 0.0022;
        
        const meshes = player.children[0].children;
        
        for (let i = 1; i < meshes.length; i++) {
            meshes[i].castShadow = true;
            meshes[i].receiveShadow = true;
        }

        player.position.copy(position);
        player.direction = new THREE.Vector3(-1, 0, 0);
        player.castShadow = true;
        player.receiveShadow = true;
        scene.add(player);
        
        callback(player);
    })
}

/**
 * 
 * @returns {THREE.WebGLRenderer}
 */
export const createRenderer = function () {
    const canvas = document.getElementById('canvas');
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });

    renderer.setClearColor('black', 1.0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const container = document.getElementById("container");
    container.insertBefore(renderer.domElement, container.firstChild);

    return renderer;
}

/**
 * 
 * @returns {THREE.Scene}
 */
export const createScene = function () {
    const scene = new THREE.Scene();

    // Add Ambient lighting
    scene.add(new THREE.AmbientLight(0xFFFFFF, 0.5));

    return scene;
};

/**
 * 
 * @param {THREE.Scene} scene 
 */
export const resetScene = (scene) => {
    scene.clear();
    scene.add(new THREE.AmbientLight(0x888888));
}

/**
 * 
 * @param {THREE.Scene} scene 
 * @param {Number} color 
 * @param {Number} intensity 
 * @param {THREE.Vector3} position 
 */
export const addPointLight = (scene, color, intensity, position) => {
    const light = new THREE.PointLight(color, intensity);
    light.position.copy(position);

    light.castShadow = true;
    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 500;

    scene.add(light);
};

/**
 * 
 * @param {THREE.Vector3} position 
 * @param {Number} radius 
 * @returns {THREE.Mesh}
 */
const createGoal = (position, radius) => {
    const geometry = new THREE.SphereGeometry(radius);
    const material = new THREE.MeshPhongMaterial({ color: 0xFFD700 });
    const mesh = new THREE.Mesh(geometry, material);

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.copy(position);

    return mesh;
}

/**
 * 
 * @param {THREE.Vector3} position 
 * @param {Number} radius 
 * @returns {THREE.Mesh}
 */
const createPowerUp = (position, radius) => {
    const geometry = new THREE.SphereGeometry(radius);
    const material = new THREE.MeshPhongMaterial({ color: 0x0000FF });
    const mesh = new THREE.Mesh(geometry, material);

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.copy(position);

    return mesh;
}

/**
 * 
 * @param {THREE.Vector3} position 
 * @param {Number} radius 
 * @returns {THREE.Mesh}
 */
const createEnergyPill = (position, radius) => {
    const geometry = new THREE.SphereGeometry(radius);
    const material = new THREE.MeshPhongMaterial({ color: 0xFF0000 });
    const mesh = new THREE.Mesh(geometry, material);

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.copy(position);

    return mesh;
}

/**
 * 
 * @param {THREE.WebGLRenderer} renderer 
 * @returns {boolean}
 */
export const resizeRendererToDisplaySize = (renderer) => {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
        renderer.setSize(width, height, false);
    }
    return needResize;
}
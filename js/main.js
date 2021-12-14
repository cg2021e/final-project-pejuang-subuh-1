import * as THREE from './three.module.js';
import { MAP_DEFINITION } from './map.js';

const UP = new THREE.Vector3(0, 0, 1);
const LEFT = new THREE.Vector3(-1, 0, 0);
const RIGHT = new THREE.Vector3(1, 0, 0);
const TOP = new THREE.Vector3(0, 1, 0);
const BOTTOM = new THREE.Vector3(0, -1, 0);
const MOVE_SPEED = 1;
const TURN_SPEED = Math.PI / 2;
const PLAYER_RADIUS = 0.25;

const createWall = function (position) {
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const wall = new THREE.Mesh(geometry, material);
    wall.position.copy(position);

    wall.isPassable = false;

    return wall;
}

const createMap = function (scene, mapDef) {
    const mapString = mapDef.map;
    const mapHeight = mapDef.map.length;
    const mapWidth = mapDef.map[0].length;

    const map = {
        top: 0,
        bottom: mapHeight - 1,
        left: 0,
        right: mapWidth - 1,
        playerSpawn: new THREE.Vector3(mapDef.start[0], -mapDef.start[1], 0),
        goal: new THREE.Vector3(mapDef.goal[0], -mapDef.goal[1], 0),
    };

    for (let i = 0; i < mapHeight; i++) {
        let y = -i;
        map[y] = {};
        for (let j = 0; j < mapWidth; j++) {
            let x = j;
            let mapNow = mapString[i][j];

            let mesh = null;

            if (map.playerSpawn.equals(new THREE.Vector3(x, y, 0))) {
                map[y][x] = {
                    'isPassable': true
                };
            } else if (map.goal.equals(new THREE.Vector3(x, y, 0))) {
                const geometry = new THREE.SphereGeometry(PLAYER_RADIUS / 2);
                const material = new THREE.MeshBasicMaterial({ color: 0xFFD700 });
                mesh = new THREE.Mesh(geometry, material);

                mesh.position.copy(map.goal);
                mesh.isPassable = true;
            }

            if (mapNow == '#') {
                mesh = createWall(new THREE.Vector3(x, y, 0))
            } else {
                map[y][x] = {
                    'isPassable': true
                };
            }

            if (mesh != null) {
                map[y][x] = mesh;
                scene.add(mesh);
            }
        }
    }
    return map;
};

const createPlayer = function (scene, position) {
    // Create spheres with decreasingly small horizontal sweeps, in order
    // to create player "death" animation.
    let playerGeometries = [];
    const numFrames = 40;
    let offset;
    for (let i = 0; i < numFrames; i++) {
        offset = (i / (numFrames - 1)) * Math.PI;
        playerGeometries.push(new THREE.SphereGeometry(PLAYER_RADIUS, 16, 16, offset, Math.PI * 2 - offset * 2));
        playerGeometries[i].rotateX(Math.PI / 2);
    }

    const playerMaterial = new THREE.MeshPhongMaterial({ color: 'red', side: THREE.DoubleSide });


    let player = new THREE.Mesh(playerGeometries[0], playerMaterial);
    player.frames = playerGeometries;
    player.currentFrame = 0;

    player.isPlayer = true;
    player.isWrapper = true;
    player.atePowerUp = false;
    player.distanceMoved = 0;

    // Initialize player facing to the left.
    player.position.copy(position);
    player.direction = new THREE.Vector3(-1, 0, 0);

    scene.add(player);

    return player;

}

const createRenderer = function () {
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setClearColor('black', 1.0);
    renderer.setSize(window.innerWidth, window.innerHeight);

    const container = document.getElementById("container");
    container.insertBefore(renderer.domElement, container.firstChild);

    return renderer;
}

const createScene = function () {
    const scene = new THREE.Scene();

    // Add Ambient lighting
    scene.add(new THREE.AmbientLight(0x888888));

    return scene;
};

let createKeys = function () {
    let keys = {};

    document.body.addEventListener('keydown', function (event) {
        keys[event.keyCode] = true;
        keys[String.fromCharCode(event.keyCode)] = true;
    });
    document.body.addEventListener('keyup', function (event) {
        keys[event.keyCode] = false;
        keys[String.fromCharCode(event.keyCode)] = false;
    });
    document.body.addEventListener('blur', function (event) {
        // Make it so that all keys are unpressed when the browser loses focus.
        for (var key in keys) {
            if (keys.hasOwnProperty(key))
                keys[key] = false;
        }
    });

    return keys;
};

const animationLoop = function (callback) {
    let previousFrameTime = window.performance.now();

    let animationSeconds = 0;

    const render = function () {
        var now = window.performance.now();
        var animationDelta = (now - previousFrameTime) / 1000;
        previousFrameTime = now;

        animationDelta = Math.min(animationDelta, 1 / 30);

        animationSeconds += animationDelta;

        callback(animationDelta, animationSeconds);

        requestAnimationFrame(render);
    };

    requestAnimationFrame(render);
}

const checkPassable = function (map, position) {
    let x = Math.round(position.x);
    let y = Math.round(position.y);

    if (map[y] && map[y][x]) {
        return map[y][x].isPassable;
    }
    return false;
}

const hideOverlay = (id) => {
    const overlay = document.getElementById(id);
    overlay.style.display = "none";
}

const main = function () {
    let keys = createKeys();
    const renderer = createRenderer();
    const scene = createScene();

    let map = null;
    let player = null;

    const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);

    camera.up.copy(UP);
    camera.targetPosition = new THREE.Vector3();
    camera.targetLookAt = new THREE.Vector3();
    camera.lookAtPosition = new THREE.Vector3();

    document.getElementById("easy").addEventListener('click', () => {
        hideOverlay("title");
        startGame("easy");
    });

    document.getElementById("medium").addEventListener('click', () => {
        hideOverlay("title");
        startGame("medium");
    });

    document.getElementById("hard").addEventListener('click', () => {
        hideOverlay("title");
        startGame("hard");
    });

    const startGame = (difficulty) => {
        map = createMap(scene, MAP_DEFINITION[difficulty]);
        player = createPlayer(scene, map.playerSpawn);
    }

    const movePlayer = function (delta) {
        // Move based on current keys being pressed.
        if (keys['W']) {
            // W - move forward
            // Because we are rotating the object above using lookAt, "forward" is to the left.
            player.translateOnAxis(LEFT, MOVE_SPEED * delta);
            player.distanceMoved += MOVE_SPEED * delta;
        }
        if (keys['S']) {
            // W - move forward
            // Because we are rotating the object above using lookAt, "forward" is to the left.
            player.translateOnAxis(LEFT, -MOVE_SPEED * delta);
            player.distanceMoved += MOVE_SPEED * delta;
        }
        if (keys['A']) {
            player.direction.applyAxisAngle(UP, TURN_SPEED * delta);

        }
        if (keys['D']) {
            player.direction.applyAxisAngle(UP, -TURN_SPEED / 2 * delta);
        }

        var leftSide = player.position.clone().addScaledVector(LEFT, PLAYER_RADIUS).round();
        var rightSide = player.position.clone().addScaledVector(RIGHT, PLAYER_RADIUS).round();
        var topSide = player.position.clone().addScaledVector(TOP, PLAYER_RADIUS).round();
        var bottomSide = player.position.clone().addScaledVector(BOTTOM, PLAYER_RADIUS).round();

        if (!checkPassable(map, leftSide)) {
            player.position.x = leftSide.x + 0.5 + PLAYER_RADIUS;
        }
        if (!checkPassable(map, rightSide)) {
            player.position.x = rightSide.x - 0.5 - PLAYER_RADIUS;
        }
        if (!checkPassable(map, topSide)) {
            player.position.y = topSide.y - 0.5 - PLAYER_RADIUS;
        }
        if (!checkPassable(map, bottomSide)) {
            player.position.y = bottomSide.y + 0.5 + PLAYER_RADIUS;
        }

    }

    const update = function (delta) {
        updateCamera(delta);
        updatePlayer(delta);
    }

    let _lookAt = new THREE.Vector3();
    const updatePlayer = function (delta) {
        if (!player) return;

        player.up.copy(player.direction).applyAxisAngle(UP, -Math.PI / 2);
        player.lookAt(_lookAt.copy(player.position).add(UP));

        movePlayer(delta)

        //show player direction
        let frame = Math.floor(0.1 / Math.PI * player.frames.length);
        player.geometry = player.frames[frame];
    }

    const updateCamera = function (delta) {
        if (!player) return;

        camera.targetPosition.copy(player.position).addScaledVector(UP, 1.5).addScaledVector(player.direction, -1);
        camera.targetLookAt.copy(player.position).add(player.direction);

        const cameraSpeed = 10;
        camera.position.lerp(camera.targetPosition, delta * cameraSpeed);
        camera.lookAtPosition.lerp(camera.targetLookAt, delta * cameraSpeed);
        camera.lookAt(camera.lookAtPosition);
    }


    animationLoop(function (delta) {
        update(delta);
        renderer.setViewport(0, 0, renderer.domElement.width, renderer.domElement.height);
        renderer.render(scene, camera);
    });

}

main();
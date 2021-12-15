import * as THREE from './three.module.js';
import { MAP_DEFINITION } from './map.js';
import { OrbitControls } from './OrbitControls.js';

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
            } else if (mapNow == '+') {
                const geometry = new THREE.SphereGeometry(PLAYER_RADIUS / 4);
                const material = new THREE.MeshBasicMaterial({ color: 0x0000FF });
                mesh = new THREE.Mesh(geometry, material);

                mesh.position.copy(new THREE.Vector3(x, y, 0));
                mesh.isPassable = true;
                mesh.isPowerUp = true;
            }
            else {
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

const resetScene = (scene) => {
    scene.clear();
    scene.add(new THREE.AmbientLight(0x888888));
}

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

const getAt = (map, position) => {
    const x = Math.round(position.x);
    const y = Math.round(position.y);

    if (map[y] && map[y][x]) {
        return map[y][x];
    }

    return null;
}

const checkPassable = function (map, position) {
    const mesh = getAt(map, position);

    if (mesh) {
        return mesh.isPassable;
    }
    return false;
}

const checkGoal = (map, position) => position.distanceToSquared(map.goal) < PLAYER_RADIUS * PLAYER_RADIUS / 4;

const checkPowerUp = function (map, position) {
    const mesh = getAt(map, position);

    if (mesh && mesh.isPowerUp) {
        return position.distanceToSquared(mesh.position) < PLAYER_RADIUS * PLAYER_RADIUS / 4;
    }

    return false;
}

const hideOverlay = (id) => {
    const overlay = document.getElementById(id);
    overlay.style.display = "none";
}

const showOverlay = (id) => {
    const overlay = document.getElementById(id);
    overlay.style.display = "flex";
};

const main = function () {
    let keys = createKeys();
    const renderer = createRenderer();
    let scene = createScene();

    let map = null;
    let player = null;

    let inGame = false;
    let isMoving = false;
    let isPoweredUp = false;
    let cameraNeedUpdate = false;

    const uiSFX = new Audio('sounds/ui.wav');
    const powerUpSFX = new Audio('sounds/powerup.wav');
    const reversePowerUpSFX = new Audio('sounds/reversePowerup.wav');
    const goalSFX = new Audio('sounds/goal.wav');

    const bgm = new Audio('sounds/bgm.ogg');
    bgm.loop = true;
    bgm.volume = 0.5;
    bgm.autoplay = true;

    const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
    //controls.update() must be called after any manual changes to the camera's transform

    camera.up.copy(UP);
    camera.targetPosition = new THREE.Vector3();
    camera.targetLookAt = new THREE.Vector3();
    camera.lookAtPosition = new THREE.Vector3();

    const controls = new OrbitControls(camera, document.getElementById("container"));
    controls.minPolarAngle = Math.PI / 6;
    controls.maxPolarAngle = Math.PI / 3;
    controls.update();
    controls.enableZoom = false;

    hideOverlay("loading");
    hideOverlay("gameover");
    hideOverlay("timer");
    hideOverlay("game");
    showOverlay("title");

    document.getElementById("easy").addEventListener('click', () => {
        hideOverlay("title");
        startGame("easy");
        uiSFX.play();
    });

    document.getElementById("medium").addEventListener('click', () => {
        hideOverlay("title");
        startGame("medium");
        uiSFX.play();
    });

    document.getElementById("hard").addEventListener('click', () => {
        hideOverlay("title");
        startGame("hard");
        uiSFX.play();
    });

    document.getElementById("restart").addEventListener('click', () => {
        hideOverlay("gameover");
        showOverlay("title");
        uiSFX.play();
    });

    const startGame = (difficulty) => {
        map = createMap(scene, MAP_DEFINITION[difficulty]);
        player = createPlayer(scene, map.playerSpawn);

        inGame = true;
        isMoving = false;
        isPoweredUp = false;

        camera.targetPosition.copy(player.position).addScaledVector(UP, 1.5).addScaledVector(player.direction, -1.5);
        camera.targetLookAt.copy(player.position).add(player.direction);

        cameraNeedUpdate = true;
        setTimeout(() => {
            cameraNeedUpdate = false;
        }, 500);

        showOverlay("game");
    }

    const movePlayer = function (delta) {
        if (!inGame || isPoweredUp) return;

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

        isMoving = keys['W'] || keys['S'] || keys['A'] || keys['D'];

        document.getElementById("distance").innerText = "Distance Walked: " + Math.round(player.distanceMoved) + " m";

        const leftSide = player.position.clone().addScaledVector(LEFT, PLAYER_RADIUS).round();
        const rightSide = player.position.clone().addScaledVector(RIGHT, PLAYER_RADIUS).round();
        const topSide = player.position.clone().addScaledVector(TOP, PLAYER_RADIUS).round();
        const bottomSide = player.position.clone().addScaledVector(BOTTOM, PLAYER_RADIUS).round();

        if (checkPowerUp(map, player.position)) {
            const mesh = getAt(map, player.position);
            mesh.isPowerUp = false;
            scene.remove(mesh);
            isMoving = false;
            powerUp();
        }

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
        if (!inGame || isPoweredUp) return;

        if (checkGoal(map, player.position)) {
            inGame = false;
            hideOverlay("game");
            showOverlay("gameover");
            document.getElementById("distance-gameover").innerText = "You walked for " + Math.round(player.distanceMoved) + " meters.";
            resetScene(scene);
            goalSFX.play();
            return;
        }

        player.up.copy(player.direction).applyAxisAngle(UP, -Math.PI / 2);
        player.lookAt(_lookAt.copy(player.position).add(UP));

        movePlayer(delta)

        //show player direction
        let frame = Math.floor(0.1 / Math.PI * player.frames.length);
        player.geometry = player.frames[frame];
    }

    const updateCamera = function (delta) {
        controls.enabled = inGame && !isMoving && !cameraNeedUpdate;

        if (!inGame) return;

        if (isMoving) {
            camera.targetPosition.copy(player.position).addScaledVector(UP, 1.5).addScaledVector(player.direction, -1.5);
            camera.targetLookAt.copy(player.position).add(player.direction);
        }

        if (!controls.enabled || isPoweredUp) {
            const cameraSpeed = 10;
            camera.position.lerp(camera.targetPosition, delta * cameraSpeed);
            camera.lookAtPosition.lerp(camera.targetLookAt, delta * cameraSpeed);
            camera.lookAt(camera.lookAtPosition);
        }

        controls.target.copy(player.position);

        controls.update();
    }

    const powerUp = () => {
        isPoweredUp = true;

        powerUpSFX.play();

        showOverlay("timer");

        camera.targetPosition.copy(player.position).addScaledVector(UP, 10);
        camera.targetLookAt.copy(player.position);

        let powerUpTime = 5;
        const timerText = document.getElementById("timer-text");
        timerText.innerText = powerUpTime;

        const timer = setInterval(() => {
            powerUpTime--;
            timerText.innerText = powerUpTime;

            if (powerUpTime <= 0) {
                clearInterval(timer);
                isPoweredUp = false;

                reversePowerUpSFX.play();

                camera.targetPosition.copy(player.position).addScaledVector(UP, 1.5).addScaledVector(player.direction, -1.5);
                camera.targetLookAt.copy(player.position).add(player.direction);

                cameraNeedUpdate = true;
                setTimeout(() => {
                    cameraNeedUpdate = false;
                }, 500);

                hideOverlay("timer");
            }
        }, 1000);
    };


    animationLoop(function (delta) {
        update(delta);
        renderer.setViewport(0, 0, renderer.domElement.width, renderer.domElement.height);
        renderer.render(scene, camera);
    });

}

main();
import * as THREE from './three.module.js';
import { MAP_DEFINITION } from './map.js';
import { OrbitControls } from './OrbitControls.js';
import {
    createMap, createPlayer, createRenderer,
    createScene, resetScene
} from './sceneHelper.js';
import {
    getAt, checkPassable,
    checkGoal, checkPowerUp
} from './mapHelper.js';
import {
    createKeys, hideOverlay, showOverlay,
    addClick, setText
} from './documentHelper.js';

const UP = new THREE.Vector3(0, 0, 1);
const LEFT = new THREE.Vector3(-1, 0, 0);
const RIGHT = new THREE.Vector3(1, 0, 0);
const TOP = new THREE.Vector3(0, 1, 0);
const BOTTOM = new THREE.Vector3(0, -1, 0);
const MOVE_SPEED = 1;
const TURN_SPEED = Math.PI / 2;
const PLAYER_RADIUS = 0.25;

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

const main = function () {
    const keys = createKeys();
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

    addClick("easy", () => {
        hideOverlay("title");
        startGame("easy");
        uiSFX.play();
    });

    addClick("medium", () => {
        hideOverlay("title");
        startGame("medium");
        uiSFX.play();
    });

    addClick("hard", () => {
        hideOverlay("title");
        startGame("hard");
        uiSFX.play();
    });

    addClick("restart", () => {
        hideOverlay("gameover");
        showOverlay("title");
        uiSFX.play();
    });

    const startGame = (difficulty) => {
        map = createMap(scene, MAP_DEFINITION[difficulty], PLAYER_RADIUS);
        player = createPlayer(scene, map.playerSpawn, PLAYER_RADIUS);

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

        setText("distance", `Distance Walked: ${Math.round(player.distanceMoved)} m`);

        const leftSide = player.position.clone().addScaledVector(LEFT, PLAYER_RADIUS).round();
        const rightSide = player.position.clone().addScaledVector(RIGHT, PLAYER_RADIUS).round();
        const topSide = player.position.clone().addScaledVector(TOP, PLAYER_RADIUS).round();
        const bottomSide = player.position.clone().addScaledVector(BOTTOM, PLAYER_RADIUS).round();

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

        if (checkPowerUp(map, player.position, PLAYER_RADIUS)) {
            const mesh = getAt(map, player.position);
            mesh.isPowerUp = false;
            scene.remove(mesh);
            isMoving = false;
            powerUp();
        }

        if (checkGoal(map, player.position, PLAYER_RADIUS)) {
            inGame = false;
            hideOverlay("game");
            showOverlay("gameover");
            setText("distance-gameover", `You walked for ${Math.round(player.distanceMoved)} meters.`);
            resetScene(scene);
            goalSFX.play();
            return;
        }

        player.up.copy(player.direction).applyAxisAngle(UP, -Math.PI / 2);
        player.lookAt(_lookAt.copy(player.position).add(UP));

        movePlayer(delta);
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
        setText("timer-text", powerUpTime);

        const timer = setInterval(() => {
            powerUpTime--;
            setText("timer-text", powerUpTime);

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

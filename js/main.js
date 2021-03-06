import * as THREE from './three.module.js';
import { OrbitControls } from './OrbitControls.js';
import {
    createMap, createPlayer, createRenderer,
    createScene, resetScene, resizeRendererToDisplaySize
} from './sceneHelper.js';
import {
    getAt, checkPassable,
    checkGoal, checkPowerUp, checkEnergyPill
} from './mapHelper.js';
import {
    createKeys, addClick,
    setText, showOneFromParent, setWidth
} from './documentHelper.js';

const UP = new THREE.Vector3(0, 0, 1);
const LEFT = new THREE.Vector3(-1, 0, 0);
const RIGHT = new THREE.Vector3(1, 0, 0);
const TOP = new THREE.Vector3(0, 1, 0);
const BOTTOM = new THREE.Vector3(0, -1, 0);
const MAX_MOVE_SPEED = 1;
const MIN_MOVE_SPEED = 0.25;
const TURN_SPEED = Math.PI / 2;
const PLAYER_RADIUS = 0.25;
const PLAYER_MAX_ENERGY = {
    easy: 180,
    medium: 360,
    hard: 540,
};
const ENERGY_PER_SECOND = 1;
const ENERGY_PILL_VALUE = 0.2;

const animationLoop = function (callback) {
    let previousFrameTime = window.performance.now();

    let animationSeconds = 0;

    const render = function () {
        const now = window.performance.now();
        let animationDelta = (now - previousFrameTime) / 1000;
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
    let playerBBox = new THREE.Box3();

    let inGame = false;
    let isMoving = false;
    let isPoweredUp = false;
    let cameraNeedUpdate = false;
    let currentEnergy = 0;
    let currentSpeed = 0;

    const uiSFX = new Audio('sounds/ui.wav');
    const powerUpSFX = new Audio('sounds/powerup.wav');
    const reversePowerUpSFX = new Audio('sounds/reversePowerup.wav');
    const goalSFX = new Audio('sounds/goal.wav');
    const failSFX = new Audio('sounds/failed.wav');
    const energyPickUpSFX = new Audio('sounds/energy.wav');

    const bgm = new Audio('sounds/bgm.ogg');
    bgm.loop = true;
    bgm.volume = 0.25;

    const playAttempt = setInterval(() => {
        bgm.play()
            .then(() => {
                clearInterval(playAttempt);
            })
            .catch(() => {
                console.log('Unable to play the audio, User has not interacted yet.');
            });
    }, 1000);

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

    showOneFromParent("title", "overlay-screen");

    const backToMenu = () => {
        resetScene(scene);
        showOneFromParent("title", "overlay-screen");
        uiSFX.play();
    };

    const restartGame = () => {
        resetScene(scene);
        startGame(map.difficulty, map.mapIndex);
        uiSFX.play();
    };

    addClick("play", () => {
        showOneFromParent("choose-difficulty", "overlay-screen");
        uiSFX.play();
    });

    addClick("how-to", () => {
        showOneFromParent("how-to-play", "overlay-screen");
        uiSFX.play();
    });

    addClick("back-from-htp", backToMenu);

    addClick("back-from-dif", backToMenu);

    addClick("easy", () => {
        startGame("easy");
        uiSFX.play();
    });

    addClick("medium", () => {
        startGame("medium");
        uiSFX.play();
    });

    addClick("hard", () => {
        startGame("hard");
        uiSFX.play();
    });

    addClick("menu-win", backToMenu);

    addClick("restart-win", restartGame);

    addClick("menu-lose", backToMenu);

    addClick("restart-lose", restartGame);

    addClick("resume-pause", () => {
        inGame = true;
        showOneFromParent("game", "overlay-screen");
        uiSFX.play();
    });

    addClick("restart-pause", restartGame);

    addClick("back-pause", backToMenu);

    const storage = window.localStorage;

    const startGame = (choosenDifficulty, mapIndex) => {
        map = createMap(scene, choosenDifficulty, PLAYER_RADIUS, mapIndex);
        createPlayer(scene, map.playerSpawn, (model) => {
            console.log("player created");
            player = model;

            inGame = true;
            isMoving = false;
            isPoweredUp = false;
            currentEnergy = PLAYER_MAX_ENERGY[map.difficulty];
            currentSpeed = MAX_MOVE_SPEED;

            camera.targetPosition.copy(player.position).addScaledVector(UP, 1.5).addScaledVector(player.direction, -1.5);
            camera.targetLookAt.copy(player.position).add(player.direction);

            cameraNeedUpdate = true;
            setTimeout(() => {
                cameraNeedUpdate = false;
            }, 500);

            showOneFromParent("game", "overlay-screen");
        });
    }

    const movePlayer = function (delta) {
        if (!inGame || isPoweredUp) return;

        const startPosition = player.position.clone();

        if (keys[" "]) {
            player.translateOnAxis(LEFT, currentSpeed * delta);
        } else {
            // Move based on current keys being pressed.
            if (keys['W']) {
                // W - move forward
                // Because we are rotating the object above using lookAt, "forward" is to the left.
                player.translateOnAxis(LEFT, currentSpeed * delta);
            }

            if (keys['S']) {
                // W - move forward
                // Because we are rotating the object above using lookAt, "forward" is to the left.
                player.translateOnAxis(LEFT, -currentSpeed * delta);
            }

            if (keys['A']) {
                player.direction.applyAxisAngle(UP, TURN_SPEED * delta);

            }

            if (keys['D']) {
                player.direction.applyAxisAngle(UP, -TURN_SPEED * delta);
            }
        }

        isMoving = keys['W'] || keys['S'] || keys['A'] || keys['D'] || keys[" "];

        playerBBox.setFromObject(player);

        const playerX = player.position.x;
        const playerY = player.position.y

        const playerLeft = playerX - playerBBox.min.x;
        const playerRight = playerBBox.max.x - playerX;
        const playerTop = (-1) * (playerY - playerBBox.max.y);
        const playerBottom = (-1) * (playerBBox.min.y - playerY);

        const leftSide = player.position.clone().addScaledVector(LEFT, playerLeft).round();
        const rightSide = player.position.clone().addScaledVector(RIGHT, playerRight).round();
        const topSide = player.position.clone().addScaledVector(TOP, playerTop).round();
        const bottomSide = player.position.clone().addScaledVector(BOTTOM, playerBottom).round();

        if (!checkPassable(map, leftSide)) {
            player.position.x = leftSide.x + 0.5 + playerLeft;
        }
        if (!checkPassable(map, rightSide)) {
            player.position.x = rightSide.x - 0.5 - playerRight;
        }
        if (!checkPassable(map, topSide)) {
            player.position.y = topSide.y - 0.5 - playerTop;
        }
        if (!checkPassable(map, bottomSide)) {
            player.position.y = bottomSide.y + 0.5 + playerBottom;
        }

        player.distanceMoved += startPosition.distanceTo(player.position);
        setText("distance", `Distance Walked: ${Math.round(player.distanceMoved)} m`);
    }

    const update = function (delta) {
        checkPause();
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
            const dist = Math.round(player.distanceMoved);
            const key = map.difficulty + map.mapIndex;
            let best = storage.getItem(key);

            if (!best || dist < best) {
                storage.setItem(key, dist);
                best = dist;
            }

            showOneFromParent("gameover-win", "overlay-screen");
            setText("distance-gameover", `You walked for ${dist} meters.`);
            setText("best-distance-gameover", `Your shortest distance for this level is ${best} meters.`);

            goalSFX.play();
            return;
        }

        if (checkEnergyPill(map, player.position, PLAYER_RADIUS)) {
            const mesh = getAt(map, player.position);
            mesh.isEnergy = false;
            scene.remove(mesh);
            currentEnergy = Math.min(currentEnergy + ENERGY_PILL_VALUE * PLAYER_MAX_ENERGY[map.difficulty], PLAYER_MAX_ENERGY[map.difficulty]);
            energyPickUpSFX.play();
        }

        if (currentEnergy <= 0) {
            inGame = false;
            showOneFromParent("gameover-lose", "overlay-screen");
            failSFX.play();
            return;
        }

        player.up.copy(player.direction).applyAxisAngle(UP, -Math.PI / 2);
        player.lookAt(_lookAt.copy(player.position).add(UP));

        if (keys[" "]) {
            currentEnergy -= delta * ENERGY_PER_SECOND * 5;
            currentSpeed = Math.max(MIN_MOVE_SPEED, currentEnergy / PLAYER_MAX_ENERGY[map.difficulty] * MAX_MOVE_SPEED * 2);
        } else {
            currentEnergy -= delta * ENERGY_PER_SECOND;
            currentSpeed = Math.max(MIN_MOVE_SPEED, currentEnergy / PLAYER_MAX_ENERGY[map.difficulty] * MAX_MOVE_SPEED);
        }

        const energyRatio = currentEnergy / PLAYER_MAX_ENERGY[map.difficulty];
        setWidth("energy-bar", `${energyRatio * 100}%`);

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

    const checkPause = () => {
        if (keys[27]) {
            showOneFromParent("paused", "overlay-screen");
            inGame = false;
        }
    }

    const powerUp = () => {
        isPoweredUp = true;

        powerUpSFX.play();

        showOneFromParent("timer", "overlay-screen");

        const cameraHeight = 3 * (map.bottom + 1) / 4;
        camera.targetPosition.copy(player.position).addScaledVector(UP, cameraHeight);
        camera.targetLookAt.copy(player.position);

        let powerUpTime = Math.round(1 + (map.bottom + 1) / 10 * 2);
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

                showOneFromParent("game", "overlay-screen");
            }
        }, 1000);
    };


    animationLoop(function (delta) {
        update(delta);

        if (resizeRendererToDisplaySize(renderer)) {
            const canvas = renderer.domElement;
            camera.aspect = canvas.clientWidth / canvas.clientHeight;
            camera.updateProjectionMatrix();
        }

        renderer.setViewport(0, 0, renderer.domElement.width, renderer.domElement.height);
        renderer.render(scene, camera);
    });

}

main();
const UP = new THREE.Vector3(0, 0, 1);
let LEFT = new THREE.Vector3(-1, 0, 0);
const MOVE_SPEED = 0.8;

const mapDefinition = [
    '##########',
    '#        #',
    '#        F',
    '#        #',
    '# #      #',
    '# #      #',
    '#P#      #',
    '##########',
];

const MAP_WIDTH = 10;
const MAP_HEIGHT = 8;

const createWall = function (position){
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
    const wall = new THREE.Mesh(geometry, material);
    wall.position.copy(position);

    wall.isPassable = false;

    return wall;
}

const createMap = function (scene) {
    let map = {};
    map.top = 0;
    map.bottom = -(MAP_HEIGHT - 1);
    map.left = 0;
    map.right = MAP_WIDTH - 1;
    map.playerSpawn = null;

    for(let i = 0; i < MAP_HEIGHT; i++){
        let y = -i; 
        map[y] =  {};    
        for(let j = 0; j < MAP_WIDTH; j++){
            let x = j;
            let mapNow = mapDefinition[i][j];

            let mesh = null;

            if(mapNow == 'P'){
                map.playerSpawn = new THREE.Vector3(x,y,0);
            }else if(mapNow == '#'){
                mesh = createWall(new THREE.Vector3(x,y,0))
            }else if(mapNow == ' '){
                map[y][x] = {
                    'isPassable': true
                };
            }

            if(mesh != null){
                map[y][x] = mesh;
                scene.add(mesh);
            }
        }
    }
    return map;
};



const createPlayer = function (scene, position) {
    let playerGeometries = [];
    const numFrames = 40;
    let offset;
    for (let i = 0; i < numFrames; i++) {
        offset = (i / (numFrames - 1)) * Math.PI;
        playerGeometries.push(new THREE.SphereGeometry(0.25, 16, 16, offset, Math.PI * 2 - offset * 2));
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
    document.body.appendChild(renderer.domElement);

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
        // all keys are unpressed when the browser loses focus.
        for (let key in keys) {
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
        let now = window.performance.now();
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
    let keys = createKeys();
    const renderer = createRenderer();
    const scene = createScene();

    const map = createMap(scene);
    console.log(map)
    const player = createPlayer(scene, map.playerSpawn);

    const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);

    camera.up.copy(UP);
    camera.targetPosition = new THREE.Vector3();
    camera.targetLookAt = new THREE.Vector3();
    camera.lookAtPosition = new THREE.Vector3();



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
            player.direction.applyAxisAngle(UP, Math.PI / 2 * delta);

        }
        if (keys['D']) {
            player.direction.applyAxisAngle(UP, -Math.PI / 2 * delta);
        }


    }

    const update = function (delta) {
        updateCamera(delta);
        updatePlayer(delta);
    }

    let _lookAt = new THREE.Vector3();
    const updatePlayer = function (delta) {
        player.up.copy(player.direction).applyAxisAngle(UP, -Math.PI / 2);
        player.lookAt(_lookAt.copy(player.position).add(UP));

        movePlayer(delta)

        //show player direction
        let frame = Math.floor(0.1 / Math.PI * player.frames.length);
        player.geometry = player.frames[frame];
    }

    const updateCamera = function (delta) {
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
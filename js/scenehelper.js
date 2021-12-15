import * as THREE from './three.module.js';

export const createWall = function (position) {
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const wall = new THREE.Mesh(geometry, material);
    wall.position.copy(position);

    wall.isPassable = false;

    return wall;
}

export const createMap = function (scene, mapDef, playerRadius) {
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
                const geometry = new THREE.SphereGeometry(playerRadius / 2);
                const material = new THREE.MeshBasicMaterial({ color: 0xFFD700 });
                mesh = new THREE.Mesh(geometry, material);

                mesh.position.copy(map.goal);
                mesh.isPassable = true;
            }

            if (mapNow == '#') {
                mesh = createWall(new THREE.Vector3(x, y, 0))
            } else if (mapNow == '+') {
                const geometry = new THREE.SphereGeometry(playerRadius / 4);
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

export const createPlayer = function (scene, position, playerRadius) {
    const triangleSide = playerRadius * 3 / Math.sqrt(3);
    const triangleHeigth = triangleSide * Math.sqrt(3) / 2;

    const vertices = [
        new THREE.Vector2(triangleHeigth - playerRadius, Math.cos(Math.PI / 3) * triangleSide),
        new THREE.Vector2(triangleHeigth - playerRadius, -Math.cos(Math.PI / 3) * triangleSide),
        new THREE.Vector2(-playerRadius, 0)
    ];

    const Shape = new THREE.Shape();

    Shape.moveTo(vertices[0].x, vertices[0].y);
    for (let i = 1; i < vertices.length; i++) {
        Shape.lineTo(vertices[i].x, vertices[i].y);
    }
    Shape.lineTo(vertices[0].x, vertices[0].y);

    const settings = {
        depth: playerRadius,
        bevelEnabled: false
    };

    var geometry = new THREE.ExtrudeGeometry(Shape, settings);

    const playerMaterial = new THREE.MeshPhongMaterial({ color: 'red' });

    const player = new THREE.Mesh(geometry, playerMaterial);

    player.distanceMoved = 0;

    player.position.copy(position);
    player.direction = new THREE.Vector3(-1, 0, 0);
    
    scene.add(player);

    return player;
}

export const createRenderer = function () {
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setClearColor('black', 1.0);
    renderer.setSize(window.innerWidth, window.innerHeight);

    const container = document.getElementById("container");
    container.insertBefore(renderer.domElement, container.firstChild);

    return renderer;
}

export const createScene = function () {
    const scene = new THREE.Scene();

    // Add Ambient lighting
    scene.add(new THREE.AmbientLight(0x888888));

    return scene;
};

export const resetScene = (scene) => {
    scene.clear();
    scene.add(new THREE.AmbientLight(0x888888));
}
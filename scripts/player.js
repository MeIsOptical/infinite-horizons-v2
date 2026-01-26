
import { CURRENT_WORLD } from "./state.js";
import * as Entities from "./entities.js"
import * as State from "./state.js";


// get a new camera
export function newCamera(type = "player") {
    let initZoom = 0.6;
    let minZoom = 0.2;
    let maxZoom = 1.7
    let zoomSpeed = 0.08;

    if (type === "map") {
        initZoom = 0.01;
        minZoom = 0.005;
        maxZoom = 0.05;
        zoomSpeed = 0.3;
    }

    return {
        x: 0,
        y: 0,
        initZoom: initZoom,
        targetZoom: initZoom,
        smoothZoom: initZoom,

        minZoom: minZoom,
        maxZoom: maxZoom,

        zoomSpeed: zoomSpeed
    }
}

// get a new player
export function newPlayer(texture) {
    return {
        //type
        type: "entities",
        displayName: "You",

        // position
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,

        // stats
        stats: {
            maxHealth: 100,
            health: 100,
            movementSpeed: 2
        },

        // inputs
        keys: { up: false, left: false, down: false, right: false },

        // appearance
        texture: texture,
        scale: 1,
        flipped: false,
    }
}





//#region CONTROL

export function updatePlayer() {
    // get player & camera
    const player = CURRENT_WORLD.player;

    //update player velocity
    if (player.keys.up) player.vy -= player.stats.movementSpeed;
    if (player.keys.left) player.vx -= player.stats.movementSpeed;
    if (player.keys.down) player.vy += player.stats.movementSpeed;
    if (player.keys.right) player.vx += player.stats.movementSpeed;

    // move player
    if (player.vx != 0 || player.vy != 0) Entities.moveEntity(player);

    // update camera
    updateCamera();
}


// update camera zoom and position
export function updateCamera() {
    const cam = CURRENT_WORLD.isMapOpen ? CURRENT_WORLD.mapCamera : CURRENT_WORLD.camera;
    const player = CURRENT_WORLD.player;

    // update zoom
    let targetZoom = cam.targetZoom - cam.smoothZoom;
    if (targetZoom != 0) cam.smoothZoom += targetZoom * cam.zoomSpeed;

    // if map is open, move camera with keys
    if (CURRENT_WORLD.isMapOpen) {
        // adjust speed based on zoom level so it feels consistent
        const mapSpeed = 4 / cam.smoothZoom; 
        if (player.keys.up) cam.y -= mapSpeed;
        if (player.keys.left) cam.x -= mapSpeed;
        if (player.keys.down) cam.y += mapSpeed;
        if (player.keys.right) cam.x += mapSpeed;
    } else {
        // if map is closed, follow the player
        let targetX = player.x - cam.x;
        let targetY = player.y - cam.y;
        if (Math.abs(targetX) < 2) targetX = 0;
        if (Math.abs(targetY) < 2) targetY = 0;
        if (targetX != 0) cam.x += targetX * 0.08;
        if (targetY != 0) cam.y += targetY * 0.1;
    }
}

//#endregion




//#region INPUTS

// movement inputs
window.addEventListener('keydown', (e) => {
    if (e.key === "w") CURRENT_WORLD.player.keys.up = true;
    if (e.key === "a") CURRENT_WORLD.player.keys.left = true;
    if (e.key === "s") CURRENT_WORLD.player.keys.down = true;
    if (e.key === "d") CURRENT_WORLD.player.keys.right = true;
    if (e.key === "m") switchCamera();
});
window.addEventListener('keyup', (e) => {
    if (e.key === 'w') CURRENT_WORLD.player.keys.up = false;
    if (e.key === 'a') CURRENT_WORLD.player.keys.left = false;
    if (e.key === 's') CURRENT_WORLD.player.keys.down = false;
    if (e.key === 'd') CURRENT_WORLD.player.keys.right = false;
});



// zoom input
window.addEventListener('wheel', (e) => {
    const cam = CURRENT_WORLD.isMapOpen ? CURRENT_WORLD.mapCamera : CURRENT_WORLD.camera;
    
    // calculate a multiplier based on the scroll direction
    const zoomSpeed = 0.001; 
    const scaleFactor = Math.exp(-e.deltaY * zoomSpeed);

    // multiply the current zoom
    cam.targetZoom *= scaleFactor;

    // clamp
    cam.targetZoom = Math.max(cam.minZoom, Math.min(cam.maxZoom, cam.targetZoom));
});



function switchCamera() {
    CURRENT_WORLD.isMapOpen = !CURRENT_WORLD.isMapOpen;
    State.togglePause(CURRENT_WORLD.isMapOpen);
    const cam = CURRENT_WORLD.isMapOpen ? CURRENT_WORLD.mapCamera : CURRENT_WORLD.camera;
    const otherCam = !CURRENT_WORLD.isMapOpen ? CURRENT_WORLD.mapCamera : CURRENT_WORLD.camera;
    const player = CURRENT_WORLD.player;
    cam.x = player.x;
    cam.y = player.y;    
    cam.smoothZoom = otherCam.smoothZoom;
    cam.targetZoom = cam.initZoom;
    
}

//#endregion


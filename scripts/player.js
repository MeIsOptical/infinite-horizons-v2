
import { CURRENT_WORLD } from "./state.js";
import * as Entities from "./entities.js"


// get a new camera
export function newCamera() {
    return {
        x: 0,
        y: 0,
        targetZoom: 1,
        smoothZoom: 1,
        minZoom: 0.008,
        maxZoom: 1.7,
    }
}

// get a new player
export function newPlayer() {
    return {
        //type
        type: "entities",

        // position
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        speed: 20,

        // inputs
        keys: { up: false, left: false, down: false, right: false },

        // appearance
        texture: "mustached_asian_elder",
        scale: 1,
        flipped: false,
    }
}





//#region CONTROL

export function updatePlayer() {
    // get player & camera
    const player = CURRENT_WORLD.player;
    const camera = CURRENT_WORLD.camera;

    //update player velocity
    if (player.keys.up) player.vy -= player.speed;
    if (player.keys.left) player.vx -= player.speed;
    if (player.keys.down) player.vy += player.speed;
    if (player.keys.right) player.vx += player.speed;

    // move player
    if (player.vx != 0 || player.vy != 0) Entities.moveEntity(player);

    // update camera
    let targetZoom = camera.targetZoom - camera.smoothZoom;
    //if (Math.abs(targetZoom) < 0.01) targetZoom = 0;
    if (targetZoom != 0) camera.smoothZoom += targetZoom * 0.1;

    let targetX = player.x - camera.x;
    let targetY = player.y - camera.y;
    if (Math.abs(targetX) < 2) targetX = 0;
    if (Math.abs(targetY) < 2) targetY = 0;
    if (targetX != 0) camera.x += targetX * 0.08;
    if (targetY != 0) camera.y += targetY * 0.1;
}

//#endregion




//#region INPUTS

// movement inputs
window.addEventListener('keydown', (e) => {
    if (e.key === 'w') CURRENT_WORLD.player.keys.up = true;
    if (e.key === 'a') CURRENT_WORLD.player.keys.left = true;
    if (e.key === 's') CURRENT_WORLD.player.keys.down = true;
    if (e.key === 'd') CURRENT_WORLD.player.keys.right = true;
});
window.addEventListener('keyup', (e) => {
    if (e.key === 'w') CURRENT_WORLD.player.keys.up = false;
    if (e.key === 'a') CURRENT_WORLD.player.keys.left = false;
    if (e.key === 's') CURRENT_WORLD.player.keys.down = false;
    if (e.key === 'd') CURRENT_WORLD.player.keys.right = false;
});



// zoom input
window.addEventListener('wheel', (e) => {
    const player = CURRENT_WORLD.player;
    const camera = CURRENT_WORLD.camera;
    
    // calculate a multiplier based on the scroll direction
    const zoomSpeed = 0.001; 
    const scaleFactor = Math.exp(-e.deltaY * zoomSpeed);

    // multiply the current zoom
    camera.targetZoom *= scaleFactor;

    // clamp
    camera.targetZoom = Math.max(camera.minZoom, Math.min(camera.maxZoom, camera.targetZoom));
});

//#endregion


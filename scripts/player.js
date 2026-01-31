
import { CURRENT_WORLD } from "./state.js";
import * as Entities from "./entities.js"
import * as State from "./state.js";
import * as Items from "./items.js";


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
            movementSpeed: 2,
            pickupRange: 200
        },

        // inputs
        keys: { up: false, left: false, down: false, right: false },

        // appearance
        texture: texture,
        scale: 1,
        flipped: false,

        // inventory
        inventory: {
            slots: [null, null, null, null, null],
            selectedSlot: 0
        }
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
    if (e.key === "e") tryPickUpNearestItem();
    if (e.key === "q") dropSelectedItem();
    if (e.key === "1") switchSelectedSlot(0);
    if (e.key === "2") switchSelectedSlot(1);
    if (e.key === "3") switchSelectedSlot(2);
    if (e.key === "4") switchSelectedSlot(3);
    if (e.key === "5") switchSelectedSlot(4);
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

    // update overlays
    const overlaysDiv = document.getElementById("gameOverlays");
    overlaysDiv.style.display = CURRENT_WORLD.isMapOpen ? "none" : "initial";
    
}

//#endregion




//#region INVENTORY

function switchSelectedSlot(slotId) {
    CURRENT_WORLD.player.inventory.selectedSlot = slotId;
    updateInventoryDisplay();
}


export function updateInventoryDisplay() {
    const selectedSlot = CURRENT_WORLD.player.inventory.selectedSlot;
    const inventory = CURRENT_WORLD.player.inventory.slots;

    inventory.forEach((slot, index) => {
        // get slot
        const slotElement = document.querySelector(`.hotbarElement[data-slot-id="${index}"]`);

        // get slot's image element
        const img = slotElement.querySelector('img');

        // update selected slot
        if (index === selectedSlot) slotElement.classList.add("selectedSlot");
        else slotElement.classList.remove("selectedSlot");

        if (slot) {
            const texture = `./assets/items/${slot.texture}.png`;
            img.src = texture;
        }
        else {
            img.src = "";
        }
    });
}




function tryPickUpNearestItem() {
    const player = CURRENT_WORLD.player;
    const nearestItem = Items.getnearestItem(player.x, player.y, player.stats.pickupRange);

    if (nearestItem) {
        const inventory = player.inventory;
        const selectedSlot = inventory.selectedSlot;
        
        if (inventory.slots[selectedSlot]) {
            // if slot already filled, try adding to another slot
            const emptySlotIndex = inventory.slots.findIndex(slot => slot === null);

            if (emptySlotIndex !== -1) {
                inventory.slots[emptySlotIndex] = nearestItem;
                updateInventoryDisplay();
                CURRENT_WORLD.items = CURRENT_WORLD.items.filter(item => item !== nearestItem);
            }
            else {
                // all slots full, replace player's selected slot
                dropSelectedItem();
                inventory.slots[selectedSlot] = nearestItem;
                updateInventoryDisplay();
                CURRENT_WORLD.items = CURRENT_WORLD.items.filter(item => item !== nearestItem);
            }
        }
        else {
            inventory.slots[selectedSlot] = nearestItem;
            updateInventoryDisplay();
            CURRENT_WORLD.items = CURRENT_WORLD.items.filter(item => item !== nearestItem);
        }
    }
}


function dropSelectedItem() {
    const player = CURRENT_WORLD.player;
    const inventory = player.inventory;
    const selectedItem = inventory.slots[inventory.selectedSlot];

    if (selectedItem) {
        CURRENT_WORLD.items.push(Items.newItem(player.x, player.y, selectedItem.texture, selectedItem.displayName, selectedItem.displayDescription, selectedItem.itemData));
        inventory.slots[inventory.selectedSlot] = null;
        updateInventoryDisplay();
    }
}

//#endregion




import * as Visuals from "./visuals.js";
import * as Player from "./player.js";
import * as Entities from "./entities.js"
import { generateVisibleChunks } from "./worldgen.js";
import * as State from "./state.js";

const canvas = document.getElementById('gameCanvas');

let lastUpdate = 0;
export function gameLoop(timestamp) {

    // get delta time
    if (lastUpdate === 0) lastUpdate = timestamp;
    let deltaTime = (timestamp - lastUpdate) / 1000; 
    lastUpdate = timestamp;

    Player.updateCamera();

    if (!State.IS_PAUSED) {
        // update chunks
        generateVisibleChunks(canvas.width, canvas.height);

        // update player
        Player.updatePlayer();

        // update entities
        Entities.updateNearbyEntities(deltaTime);
    }

    // draw game
    Visuals.drawGame();

    requestAnimationFrame(gameLoop);

}
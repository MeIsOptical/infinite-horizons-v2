

import * as Visuals from "./visuals.js";
import * as Player from "./player.js";


export function gameLoop() {

    Player.updatePlayer();

    // draw game
    Visuals.drawGame();

    requestAnimationFrame(gameLoop);

}

import * as Physics from "./physics.js"


// get a new entity
export function newEntity(x, y, texture) {
    return {
        //type
        type: "entities",

        // position
        x: x,
        y: y,
        vx: 0,
        vy: 0,
        speed: 1,

        // appearance
        texture: texture,
        scale: 1,
        flipped: false,
    }
}




// move entity based on velocity
export function moveEntity(entity) {
    if (entity.vx < 0) { entity.flipped = true; }
    else if (entity.vx > 0) entity.flipped = false;

    // move entity x
    entity.x += entity.vx;
    if (Physics.getCollisions(entity).length > 0) { // colliding with something
        // go back
        entity.x -= entity.vx;
        // slightly move until collides
        const step = Math.sign(entity.vx);
        for (let i = 0; i < Math.abs(entity.vx); i++) {
            entity.x += step;
            if (Physics.getCollisions(entity).length > 0) {
                entity.x -= step;
                break;
            }
        }
        // stop velocity x
        entity.vx = 0;
    }


    // move entity y
    entity.y += entity.vy;
    if (Physics.getCollisions(entity).length > 0) { // colliding with something
        // go back
        entity.y -= entity.vy;
        // slightly move until collides
        const step = Math.sign(entity.vy);
        for (let i = 0; i < Math.abs(entity.vy); i++) {
            entity.y += step;
            if (Physics.getCollisions(entity).length > 0) {
                entity.y -= step;
                break;
            }
        }
        // stop velocity y
        entity.vy = 0;
    }


    // apply friction
    entity.vx *= 0.8;
    entity.vy *= 0.8;
    if (Math.abs(entity.vx) < 0.1) entity.vx = 0;
    if (Math.abs(entity.vy) < 0.1) entity.vy = 0;
}





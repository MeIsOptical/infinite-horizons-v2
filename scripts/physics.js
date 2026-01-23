
import { CURRENT_WORLD } from "./state.js";
import { ASSETS } from "../assets/assets.js";
import { PIXEL_SCALE } from "./visuals.js";
import { getVisibleElements } from "./visuals.js";






export function getCollisions(target, strict = false) {

    const collisions = [];

    // get the target's hitbox
    const targetHitbox = getHitbox(target);

    // get all elements that can have collisions
    const potentialColliders = getVisibleElements().filter(e => e !== target);

    // check potential collisions
    for (const element of potentialColliders) {

        // get element's hitbox
        const asset = ASSETS[element.type][element.texture];
        const elementHitbox = getHitbox(element);

        // if not strict, only check if asset has collisions
        if (!strict && !asset.hasCollision) continue;

        const isOverlapping = !(
            targetHitbox.right < elementHitbox.left || // target too far left
            targetHitbox.left > elementHitbox.right || // target too far right
            targetHitbox.top > elementHitbox.bottom || // target too high
            targetHitbox.bottom < elementHitbox.top // target too low
        );

        if (isOverlapping) {
            collisions.push(element);
        }
    }

    return collisions;

}

function getHitbox(target) {

    // get width and height
    const asset = ASSETS[target.type][target.texture];
    const width = asset.image.naturalWidth * PIXEL_SCALE * target.scale;
    const height = asset.image.naturalHeight * PIXEL_SCALE * target.scale;

    return {
        left: target.x - (width / 2) + 10,
        right: target.x + (width / 2) - 10,
        top: target.y - (height / 2 * -0.3),
        bottom: target.y + (height / 2),
    }
}
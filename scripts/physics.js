
import { ASSETS } from "../assets/assets.js";
import { PIXEL_SCALE } from "./visuals.js";
import { getVisibleElements } from "./visuals.js";






export function getCollisions(target, strict = false) {

    const potentialColliders = getVisibleElements().filter(e => e !== target);

    return getCollisionsFromArray(target, potentialColliders, strict);

}



export function getCollisionsFromArray(target, colliders, strict = false) {

    const collisions = [];

    // get the target's hitbox
    const targetHitbox = getHitbox(target);

    // get all elements that can have collisions
    const potentialColliders = colliders;

    // check potential collisions
    for (const element of potentialColliders) {

        // get element's hitbox
        let hasCollision = false;
        if (element.type === "tiles") hasCollision = (element.layer === "wall");
         else hasCollision = ASSETS[element.type][element.texture].hasCollision;

        // if not strict, only check if asset has collisions
        if (!strict && !hasCollision) continue;

        const elementHitbox = getHitbox(element);

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
    let width = target.width;
    let height = target.height;

    const asset = ASSETS[target.type][target.texture];
    // if target doesn't have a hardcoded width/height, calculate it from the texture asset
    if (width === undefined || height === undefined) {
        width = asset.image.naturalWidth * PIXEL_SCALE * target.scale;
        height = asset.image.naturalHeight * PIXEL_SCALE * target.scale;
    }

    // differentiate hitbox styles based on element type

    // tiles
    if (target.type === "tiles" || target.type === "structures") {
        return {
            left: target.x - (width / 2),
            right: target.x + (width / 2),
            top: target.y - (height / 2),
            bottom: target.y + (height / 2),
        };
    }

    // rest
    const hitboxHeightScale = asset.hitboxHeightScale ? asset.hitboxHeightScale : 0.3;
    return {
        left: target.x - (width / 2) + (10 * target.scale),
        right: target.x + (width / 2) - (10 * target.scale),
        top: target.y - (height * (hitboxHeightScale - 0.5)),
        bottom: target.y + (height / 2) - (2 * target.scale),
    };
}
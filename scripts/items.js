import { CURRENT_WORLD } from "./state.js";
import { ASSETS } from "../assets/assets.js";


// maps to convert stats from text to values
const WEAPON_DAMAGE_MAP = { "VERY LOW": 5, "LOW": 10, "MEDIUM": 20, "HIGH": 35, "VERY HIGH": 50 };
const WEAPON_REACH_MAP = { "VERY LOW": 75, "LOW": 150, "MEDIUM": 225, "HIGH": 300, "VERY HIGH": 375 };
const WEAPON_COOLDOWN_MAP = { "VERY LOW": 0.3, "LOW": 0.7, "MEDIUM": 1.2, "HIGH": 1.5, "VERY HIGH": 2.5 };
const WEAPON_ARC_MAP = { "VERY LOW": 30, "LOW": 45, "MEDIUM": 65, "HIGH": 100, "VERY HIGH": 135 };
const WEAPON_LUNGE_MAP = { "VERY LOW": 0.5, "LOW": 1.2, "MEDIUM": 2, "HIGH": 3, "VERY HIGH": 4 };
const CONSUMABLE_HEALTH_MAP = { "VERY LOW": 5, "LOW": 12, "MEDIUM": 20, "HIGH": 35, "VERY HIGH": 55 };



export function newItem(x, y, texture, displayName, displayDescription, itemData) {
    return {
        type: "items",
        displayName: displayName,
        displayDescription: displayDescription,

        x: x,
        y: y,

        itemData: itemData,

        texture: texture,
        scale: 1,
        flipped: false
    }
}





// get the nearest item in a radius around a certain x, y
export function getnearestItem(centerX, centerY, radius) {
    const radiusSq = radius ** 2;

    let nearestItem = null;
    let nearestItemDistSq = Infinity;
    for (const item of CURRENT_WORLD.items) {
        // get item width and height
        const asset = ASSETS.items[item.texture];
        const itemWidth = asset.image.naturalWidth;
        const itemHeight = asset.image.naturalHeight;

        // calculate item's center
        const itemCenterX = item.x + itemWidth / 2;
        const itemCenterY = item.y + itemHeight / 2;

        // calculate distance
        const itemDistanceSq = (centerX - itemCenterX) ** 2 + (centerY - itemCenterY) ** 2;

        if (itemDistanceSq < nearestItemDistSq && itemDistanceSq < radiusSq) {
            nearestItem = item;
            nearestItemDistSq = itemDistanceSq;
        }
    }

    return nearestItem;
}
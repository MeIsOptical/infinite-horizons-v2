
import * as Physics from "./physics.js"
import { CURRENT_WORLD } from "./state.js";


// maps to convert stats from text to values
const HEALTH_MAP = {
    "VERY LOW": 20,
    "LOW": 50,
    "MEDIUM": 100,
    "HIGH": 250,
    "VERY HIGH": 500
}

const MOV_SPEED_MAP = {
    "VERY LOW": 0.2,
    "LOW": 0.6,
    "MEDIUM": 1,
    "HIGH": 1.6,
    "VERY HIGH": 3
}

const VISION_RANGE_MAP = {
    "VERY LOW": 600,
    "LOW": 1200,
    "MEDIUM": 1800,
    "HIGH": 2600,
    "VERY HIGH": 4500
}


// maps the debug colors of all possible entity actions
export const ENTITY_ACTION_COLORS = {
    "IDLE": "#d8eaff",
    "WANDER": "#9cff5f",
    "ATTACK": "#ff5f5f",
    "FLEE": "#ffee58",
    "FOLLOW": "#d078ff",
    "WEAVE": "#ff9b53"
}


// get a new entity
export function newEntity(x, y, texture, displayName, traits, stats) {
    return {
        //type
        type: "entities",
        displayName: displayName,

        // position
        x: x,
        y: y,
        vx: 0,
        vy: 0,

        // traits
        traits: traits,
        
        // stats
        stats: {
            maxHealth: HEALTH_MAP[stats.health],
            health: HEALTH_MAP[stats.health],
            movementSpeed: MOV_SPEED_MAP[stats.movementSpeed],
            visionRange: VISION_RANGE_MAP[stats.visionRange]
        },

        // appearance
        texture: texture,
        scale: 1,
        flipped: false,
    }
}


//#region MOVEMENT

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

//#endregion




//#region BEHAVIOR

export function updateNearbyEntities(deltaTime) {

    const radius = 7000;
    const radiusSq = radius * radius; // square it for performance
    const player = CURRENT_WORLD.player;

    // get entities that are close enough
    const simulationEntities = CURRENT_WORLD.entities.filter(entity => {
        // get distance squared between player and entity
        const dx = player.x - entity.x;
        const dy = player.y - entity.y;
        const distSq = dx * dx + dy * dy;

        // keep if it inside the radius
        return distSq <= radiusSq; 
    });
    
    // update entities
    for (const entity of simulationEntities) {
        
        updateEntity(entity, deltaTime);

    }
}



const entityBehavior = {
    "AGGRESSIVE": (entity, player, rangeSq, distSq) => {
        // if player is within range, attack them
        if (distSq < rangeSq) return { type: "ATTACK", weight: 5, speed: 1.1 };
        return;
    },
    "REGENERATIVE": (entity, player, rangeSq, distSq) => {
        // passive effect: heal the entity slightly every frame
        if (entity.stats.health < entity.stats.maxHealth) entity.stats.health += 0.01;
        // run away to heal if health is under 30%
        if (entity.stats.health < entity.stats.maxHealth * 0.3) return { type: "FLEE", weight: 12, speed: 1.1 };
        return null;
    },
    "COWARD": (entity, player, rangeSq, distSq) => {
        // run away if health under 60% and player is within range
        if (distSq < rangeSq && entity.stats.health < entity.stats.maxHealth * 0.6) return { type: "FLEE", weight: 15, speed: 1.3 };
        return;
    },
    "WANDERER": (entity, player, rangeSq, distSq) => {
        // basic behavior
        return { type: "WANDER", weight: 1, speed: 0.5 };
    },
    "SKITTISH": (entity, player, rangeSq, distSq) => {
        // minimum  distance
        const minDistSq = rangeSq * 0.36; // 0.6 * 0.6 = 0.36
        // player too close
        if (distSq < minDistSq) return { type: "FLEE", weight: 8, speed: 1.1 };
        return null;
    },
    "COMPANION": (entity, player, rangeSq, distSq) => {
        // minimum distance
        const minDistSq = 90000; // 300 * 300 = 90000
        // maximum distance
        const maxDistSq = 490000; // 700 * 700 = 490000
        // player too close
        if (distSq < minDistSq) return { type: "FLEE", weight: 4, speed: 1.1 };
        // sweet spot
        if (distSq >= minDistSq && distSq <= maxDistSq) return { type: "WANDER", weight: 2, speed: 0.2 }; 
        // player too far
        if (distSq < rangeSq) return { type: "FOLLOW", weight: 3, speed: 1.2 };
        return null;
    },
    "STALKER": (entity, player, rangeSq, distSq) => {
        // minimum distance: 45%
        const minDistSq = rangeSq * 0.2025; // 0.45 * 0.45 = 0.2025
        // maximum distance: 70%
        const maxDistSq = rangeSq * 0.49; // 0.7 * 0.7 = 0.49
        // player too close (0%-45%)
        if (distSq < minDistSq) return { type: "FLEE", weight: 4, speed: 1.2 };
        // sweet spot (45%-70%)
        if (distSq >= minDistSq && distSq <= maxDistSq) return { type: "IDLE", weight: 2, speed: 0 }; 
        // player too far (70%-100%)
        if (distSq < rangeSq) return { type: "FOLLOW", weight: 3, speed: 1 };
        return null;
    },
    "VULTURE": (entity, player, rangeSq, distSq) => {
        // player at low health
        if (distSq < rangeSq && player.stats.health < player.stats.maxHealth * 0.4) return { type: "ATTACK", weight: 10, speed: 1.3 };
        return null;
    },
    "VIPER": (entity, player, rangeSq, distSq) => {
        // charge distance
        const chargeZoneSq = 360000; // 600 * 600 = 360000
        // charge if very close
        if (distSq < chargeZoneSq) return { type: "ATTACK", weight: 8, speed: 2 };
        // weave slowly towards player until close enough
        if (distSq < rangeSq) return { type: "WEAVE", weight: 6, speed: 0.8 };
        return null;
    },
}


// checks which is the best action to do based on entity traits
function updateEntity(entity, deltaTime) {
    const player = CURRENT_WORLD.player;
    const distSq = getDistanceSq(entity, player);
    let bestAction = { type: "WANDER", weight: 0, speed: 0.6 }; // default behavior

    const rangeSq = entity.stats.visionRange * entity.stats.visionRange;
    entity.traits.forEach(traitName => {
        const action = entityBehavior[traitName](entity, player, rangeSq, distSq);
        if (action && action.weight > bestAction.weight) bestAction = action;
    });

    entity.currentAction = bestAction;
    // execute best action
    executeEntityAction(entity, bestAction, deltaTime);

}



// make a target entity execute an action
function executeEntityAction(entity, action, deltaTime) {
    if (!action) return;

    const player = CURRENT_WORLD.player;

    const baseSpeed = entity.stats.movementSpeed;
    let targetAngle = 0;
    let isMoving = true;
    let speedMultiplier = action.speed;

    switch (action.type) {
        case "ATTACK":
            targetAngle = Math.atan2(player.y - entity.y, player.x - entity.x); // point at player
            break;

        case "FOLLOW":
            targetAngle = Math.atan2(player.y - entity.y, player.x - entity.x); // point at player
            break;

        case "FLEE":
            targetAngle = Math.atan2(player.y - entity.y, player.x - entity.x) + Math.PI; // point away from player
            break;

        case "WANDER":
            // to prevent entities from jittering, we only change direction every few seconds
            if (!entity.wanderTimer || entity.wanderTimer <= 0) {
                entity.wanderAngle = Math.random() * Math.PI * 2; // random angle
                entity.wanderTimer = 2 + Math.random() * 5; // 2-7 secs
                entity.wanderSpeed = Math.random() < 0.6 ? speedMultiplier : 0;
            }
            entity.wanderTimer -= deltaTime;
            targetAngle = entity.wanderAngle;
            speedMultiplier = entity.wanderSpeed;
            break;

        case "WEAVE":
            // point towards player, but moves in a zigzag pattern
            const baseAngle = Math.atan2(player.y - entity.y, player.x - entity.x);
            targetAngle = baseAngle + Math.sin(Date.now() / 400) * 1.2; 
            break;

        case "IDLE":
            isMoving = false;
            break;
    }

    // apply movement to entity
    if (isMoving) {
        const finalSpeed = baseSpeed * speedMultiplier;
        entity.vx += Math.cos(targetAngle) * finalSpeed;
        entity.vy += Math.sin(targetAngle) * finalSpeed;
    }

    if (Math.abs(entity.vx) > 0.1) {
        entity.flipped = entity.vx < 0; 
    }

    if (entity.vx != 0 || entity.vy != 0) moveEntity(entity);
}

//#endregion



function getDistanceSq(element1, element2) {
    const dx = element2.x - element1.x;
    const dy = element2.y - element1.y;
    return dx * dx + dy * dy;
}
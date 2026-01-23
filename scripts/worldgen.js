

import * as Player from "./player.js";
import * as Entities from "./entities.js";
import { CURRENT_WORLD } from "./state.js";


// world gen settings
const BIOME_CELL_SIZE = 3000; // size of biomes
const BIOME_SCALE = 0.12; // lower number = larger biomes.



// for generating a new world
export async function generateNewWorld(newWorldConfig) {

    // camera
    CURRENT_WORLD.camera = Player.newCamera();

    // player
    CURRENT_WORLD.player = Player.newPlayer();

    // reset lists
    CURRENT_WORLD.props = [];
    CURRENT_WORLD.entities = [];
    CURRENT_WORLD.items = [];

    // world
    CURRENT_WORLD.worldConfig = newWorldConfig;
    CURRENT_WORLD.cachedAboveBiomes = CURRENT_WORLD.worldConfig.biomes.filter(e => e.biomeType === "ABOVE");
    CURRENT_WORLD.cachedRegionBiomes = CURRENT_WORLD.worldConfig.biomes.filter(e => e.biomeType === "REGION");
    CURRENT_WORLD.worldSeed = Math.floor(Math.random() * 100000); // random seed


    // test props
    CURRENT_WORLD.props.push(newProp(-500, 0, "big_clay_pot"));    
    CURRENT_WORLD.entities.push(Entities.newEntity(500, 0, "cow"));

    // move camera to player location
    CURRENT_WORLD.camera.x = CURRENT_WORLD.player.x;
    CURRENT_WORLD.camera.y = CURRENT_WORLD.player.y;

    console.log("Generated world:\n", CURRENT_WORLD);

}







// get a new prop
function newProp(x, y, texture) {
    return {
        //type
        type: "props",

        // position
        x: x,
        y: y,

        // appearance
        texture: texture,
        scale: 1,
        flipped: false,
    }
}









// get the biome centers that are visible on screen
export function getVisibleBiomePoints(camX, camY, screenW, screenH) {
    const points = [];
    
    // set min/max positions
    const startX = Math.floor((camX - screenW/2) / BIOME_CELL_SIZE) - 1;
    const endX   = Math.floor((camX + screenW/2) / BIOME_CELL_SIZE) + 1;
    const startY = Math.floor((camY - screenH/2) / BIOME_CELL_SIZE) - 1;
    const endY   = Math.floor((camY + screenH/2) / BIOME_CELL_SIZE) + 1;

    // get points
    for (let gx = startX; gx <= endX; gx++) {
        for (let gy = startY; gy <= endY; gy++) {
            points.push(generateBiomePoint(gx, gy));
        }
    }
    return points;
}



// generate a biome point for a cell in a grid
function generateBiomePoint(gridX, gridY) {

    // get list of biomes
    const biomeRegistry = CURRENT_WORLD.worldConfig.biomes;

    // create a unique seed for this cell
    const cellSeed = CURRENT_WORLD.worldSeed + (gridX * 73856093) ^ (gridY * 19349663);

    // get random position in cell
    const randX = pseudoRandom(cellSeed);
    const randY = pseudoRandom(cellSeed + 1);
    const worldX = (gridX * BIOME_CELL_SIZE) + (randX * BIOME_CELL_SIZE);
    const worldY = (gridY * BIOME_CELL_SIZE) + (randY * BIOME_CELL_SIZE);

    // generate the 3 noise values
    const scale = BIOME_SCALE;
    const primaryVal = smoothNoise(gridX * scale, gridY * scale, CURRENT_WORLD.worldSeed); // axis 1
    const secondaryVal = smoothNoise(gridX * scale + 500, gridY * scale + 500, CURRENT_WORLD.worldSeed); // axis 2
    const scatterVal = pseudoRandom(cellSeed + 30); // using 'pseudoRandom' to be random, not smooth

    let selectedBiome = null;

    // check 'ABOVE' biomes
    for (const biome of CURRENT_WORLD.cachedAboveBiomes) {
        // check luck
        if (scatterVal < biome.rarity) continue;

        // optional axis check
        if (biome.generationAxes) {
            // calculate distance to target environment
            const dist = Math.hypot(
                primaryVal - biome.generationAxes.primary,
                secondaryVal - biome.generationAxes.secondary
            );
            // if too far from ideal conditions, don't spawn
            if (dist > 0.15) continue; 
        }

        // match found
        selectedBiome = biome;
        break; 
    }


    // check 'REGION' biomes if no 'ABOVE' matched the conditions
    if (!selectedBiome) {
        let minDist = Infinity;
        
        for (const biome of CURRENT_WORLD.cachedRegionBiomes) {
            // calculate distance to target environment
            const dist = Math.hypot(
                primaryVal - biome.generationAxes.primary,
                secondaryVal - biome.generationAxes.secondary
            );

            if (dist < minDist) {
                // match found
                minDist = dist;
                selectedBiome = biome;
            }
        }
    }

    // safety fallback
    if (!selectedBiome) selectedBiome = biomeRegistry[0];


    return { 
        ...selectedBiome,
        x: worldX, 
        y: worldY, 
    };
}


// generate randomness from a seed
export function pseudoRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}



// generate smooth randomness from a seed
function smoothNoise(x, y, seed) {
    const floorX = Math.floor(x);
    const floorY = Math.floor(y);
    
    // smooth interpolation
    const s = (v) => v * v * (3 - 2 * v);
    const u = s(x - floorX);
    const v = s(y - floorY);

    // get random values for the corners of the grid
    const hash = (i, j) => pseudoRandom(seed + i * 1341 + j * 4325);
    
    const g00 = hash(floorX, floorY);
    const g10 = hash(floorX + 1, floorY);
    const g01 = hash(floorX, floorY + 1);
    const g11 = hash(floorX + 1, floorY + 1);

    // mix the values together
    const x1 = g00 + (g10 - g00) * u;
    const x2 = g01 + (g11 - g01) * u;
    
    return x1 + (x2 - x1) * v;
}
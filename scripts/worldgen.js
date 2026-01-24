
import { ASSETS } from "../assets/assets.js";
import { PIXEL_SCALE } from "./visuals.js";
import * as Player from "./player.js";
import * as Entities from "./entities.js";
import { CURRENT_WORLD } from "./state.js";
import { getCollisions } from "./physics.js";


// biome generation settings
const BIOME_CELL_SIZE = 4000; // size of biomes
const BIOME_SCALE = 0.2; // lower number = larger biomes.

// chunk generation settings
export const GEN_CHUNK_SIZE = 2000;
const PROP_SPAWN_STEP = 350; // distance between potential spawn attempts



// for generating a new world
export async function generateNewWorld(newWorldConfig) {

    // reset lists
    CURRENT_WORLD.loadedChunks = [];
    CURRENT_WORLD.entities = [];
    CURRENT_WORLD.items = [];

    // world
    CURRENT_WORLD.worldConfig = newWorldConfig;
    CURRENT_WORLD.cachedAboveBiomes = newWorldConfig.biomes.filter(e => e.biomeType === "ABOVE");
    CURRENT_WORLD.cachedRegionBiomes = newWorldConfig.biomes.filter(e => e.biomeType === "REGION");
    CURRENT_WORLD.worldSeed = Math.floor(Math.random() * 100000); // random seed

    // player
    CURRENT_WORLD.player = Player.newPlayer(newWorldConfig.settings.playerTexture);

    // camera
    CURRENT_WORLD.camera = Player.newCamera();

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






//#region BIOME GENERATION

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



// function to get a biome at any position
export function getBiomeAtLocation(x, y) {

    // get biome centers
    const points = getVisibleBiomePoints(x, y, BIOME_CELL_SIZE, BIOME_CELL_SIZE);

    let closestDistSq = Infinity;
    let closestPoint = null;

    // find closest biome center
    for (const center of points) {
        const dx = x - center.x;
        const dy = y - center.y;
        
        const distSq = (dx * dx) + (dy * dy);

        if (distSq < closestDistSq) {
            closestDistSq = distSq;
            closestPoint = center;
        }
    }

    return closestPoint; 
}


//#endregion




//#region CHUNK GENERATION


export function generateVisibleChunks(canvasWidth, canvasHeight) {
    const cam = CURRENT_WORLD.camera;
    const zoom = cam.smoothZoom;

    if (CURRENT_WORLD.camera.smoothZoom < 0.1) return;

    // calculate the visible screen area in world coordinates
    const viewW = canvasWidth / zoom;
    const viewH = canvasHeight / zoom;

    // set boundaries
    const viewLeft = cam.x - (viewW / 2) - GEN_CHUNK_SIZE;
    const viewRight = cam.x + (viewW / 2) + GEN_CHUNK_SIZE;
    const viewTop = cam.y - (viewH / 2) - GEN_CHUNK_SIZE;
    const viewBottom = cam.y + (viewH / 2) + GEN_CHUNK_SIZE;

    // convert to chunk grid coords
    const startChunkX = Math.floor(viewLeft / GEN_CHUNK_SIZE);
    const endChunkX = Math.floor(viewRight / GEN_CHUNK_SIZE);
    const startChunkY = Math.floor(viewTop / GEN_CHUNK_SIZE);
    const endChunkY = Math.floor(viewBottom / GEN_CHUNK_SIZE);

    // loop through the grid and generate
    for (let cx = startChunkX; cx <= endChunkX; cx++) {
        for (let cy = startChunkY; cy <= endChunkY; cy++) {
            generateChunkData(cx, cy); 
        }
    }
}




export function generateChunkData(chunkX, chunkY) {
    const chunkKey = `${chunkX},${chunkY}`;
    const existingChunk = CURRENT_WORLD.loadedChunks.find(chunk => chunk.id === chunkKey);
    if (existingChunk) return existingChunk;

    const chunkWorldX = chunkX * GEN_CHUNK_SIZE;
    const chunkWorldY = chunkY * GEN_CHUNK_SIZE;
    const maxChunkX = (chunkX + 1) * GEN_CHUNK_SIZE;
    const maxChunkY = (chunkY + 1) * GEN_CHUNK_SIZE;

    // chunk definition
    const newChunk = {
        id: chunkKey,
        x: chunkWorldX,
        y: chunkWorldY,
        props: []
    };

    // push new chunk to array
    CURRENT_WORLD.loadedChunks.push(newChunk);
    const chunkSeed = CURRENT_WORLD.worldSeed + (chunkX * 12345) ^ (chunkY * 67890);

    // add elements (props, entities, items)
    for (let localX = 0; localX < GEN_CHUNK_SIZE; localX += PROP_SPAWN_STEP) {
        for (let localY = 0; localY < GEN_CHUNK_SIZE; localY += PROP_SPAWN_STEP) {

            const worldX = chunkWorldX + localX;
            const worldY = chunkWorldY + localY;
            const biome = getBiomeAtLocation(worldX, worldY);

            // get biome props, entities and items
            const biomeProps = (biome.props || []).map(e => ({ ...e, type: "props" }));
            const biomeEntities = (biome.entities || []).map(e => ({ ...e, type: "entities" }));

            // order props in random order
            const tileSeed = chunkSeed + (localX * 13) + (localY * 37);
            const shuffledElements = [...biomeProps, ...biomeEntities];
            for (let i = shuffledElements.length - 1; i > 0; i--) {
                const j = Math.floor(pseudoRandom(tileSeed + i) * (i + 1));
                [shuffledElements[i], shuffledElements[j]] = [shuffledElements[j], shuffledElements[i]];
            }

            // loop props until one matches
            for (const propConfig of shuffledElements) {
                const propSeed = tileSeed + propConfig.texture.length;
                const densityRoll = pseudoRandom(propSeed);

                let effectiveDensity = propConfig.density;
                if (propConfig.type === "entities") { // make entities rarer than props
                    effectiveDensity *= 0.1;
                }

                if (densityRoll < effectiveDensity) {
                    let finalX = worldX + (pseudoRandom(propSeed + 1) * PROP_SPAWN_STEP);
                    let finalY = worldY + (pseudoRandom(propSeed + 2) * PROP_SPAWN_STEP);

                    const elementScale = 1;

                    // get the prop's width and height
                    const asset = ASSETS[propConfig.type][propConfig.texture];
                    const width = asset.image.naturalWidth * PIXEL_SCALE * elementScale / 2;
                    const height = asset.image.naturalHeight * PIXEL_SCALE * elementScale / 2;

                    // clamp to make sure the prop stays in the chunk
                    const gridBuffer = 30;
                    finalX = Math.min(Math.max(finalX, chunkWorldX + width - gridBuffer), maxChunkX - width + gridBuffer);
                    finalY = Math.min(Math.max(finalY, chunkWorldY + height - gridBuffer), maxChunkY - height + gridBuffer);

                    // define the element
                    if (propConfig.type === "props") { // is a prop
                        const element = newProp(finalX, finalY, propConfig.texture);
                        element.flipped = pseudoRandom(propSeed + 3) > 0.5;
                        element.scale = elementScale;

                        // collision check
                        if (getCollisions(element, true).length === 0) {
                            newChunk.props.push(element);
                            break;
                        }
                    }
                    else if (propConfig.type === "entities") {
                        const element = Entities.newEntity(finalX, finalY, propConfig.texture, propConfig.displayName, propConfig.traits, propConfig.stats);
                        element.flipped = pseudoRandom(propSeed + 3) > 0.5;
                        element.scale = elementScale;

                        // collision check
                        if (getCollisions(element, true).length === 0) {
                            CURRENT_WORLD.entities.push(element);
                            break;
                        }
                    }
                }
            }
        }
    }
    return newChunk;
}

//#endregion




//#region PSEUDO RANDOMNESS

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

//#endregion


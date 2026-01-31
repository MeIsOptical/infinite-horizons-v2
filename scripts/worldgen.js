
import { ASSETS } from "../assets/assets.js";
import { PIXEL_SCALE } from "./visuals.js";
import * as Player from "./player.js";
import * as Entities from "./entities.js";
import { CURRENT_WORLD } from "./state.js";
import { getCollisionsFromArray } from "./physics.js";
import * as Items from "./items.js";


// biome generation settings
const BIOME_CELL_SIZE = 4000; // size of biomes
const BIOME_SCALE = 0.26; // lower number = larger biomes.

// chunk generation settings
const PROP_SPAWN_STEP = 300; // distance between potential spawn attempts
const TILE_SIZE = 16 * PIXEL_SCALE;
export const GEN_CHUNK_SIZE = TILE_SIZE * 36;



// for generating a new world
export async function generateNewWorld(newWorldConfig) {

    // reset lists
    CURRENT_WORLD.loadedChunks = [];
    CURRENT_WORLD.entities = [];
    CURRENT_WORLD.items = [];

    // player
    CURRENT_WORLD.player = Player.newPlayer(newWorldConfig.settings.playerTexture);

    // cameras
    CURRENT_WORLD.camera = Player.newCamera("player"); // main camera
    CURRENT_WORLD.mapCamera = Player.newCamera("map"); // camera when looking at the map
    CURRENT_WORLD.isMapOpen = false;

    // world
    CURRENT_WORLD.worldConfig = newWorldConfig;
    CURRENT_WORLD.cachedAboveBiomes = newWorldConfig.biomes.filter(e => e.biomeType === "ABOVE");
    CURRENT_WORLD.cachedRegionBiomes = newWorldConfig.biomes.filter(e => e.biomeType === "REGION");
    CURRENT_WORLD.worldSeed = Math.floor(Math.random() * 100000); // random seed

    // move camera to player location
    CURRENT_WORLD.camera.x = CURRENT_WORLD.player.x;
    CURRENT_WORLD.camera.y = CURRENT_WORLD.player.y;

    console.log("Generated world:\n", CURRENT_WORLD);

}







// get a new prop
export function newProp(x, y, texture) {
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


// get a new tile
function newTile(x, y, texture, layer, tint) {
    return {
        //type
        type: "tiles",

        // position
        x: x,
        y: y,

        // appearance
        texture: texture,
        scale: 1,
        flipped: false,

        layer: layer,
        tint: tint
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
    const tertiaryVal = smoothNoise(gridX * scale + 1000, gridY * scale + 1000, CURRENT_WORLD.worldSeed); // axis 3
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
                (primaryVal - biome.generationAxes.primary),
                (secondaryVal - biome.generationAxes.secondary) * 0.7,
                (tertiaryVal - biome.generationAxes.tertiary) * 0.3
            );
            // if too far from ideal conditions, don't spawn
            if (dist > 0.2) continue; 
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
                (primaryVal - biome.generationAxes.primary),
                (secondaryVal - biome.generationAxes.secondary) * 0.7,
                (tertiaryVal - biome.generationAxes.tertiary) * 0.3
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
    const cam = CURRENT_WORLD.isMapOpen ? CURRENT_WORLD.mapCamera : CURRENT_WORLD.camera;
    const zoom = cam.smoothZoom;

    if (cam.smoothZoom < 0.1) return;

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
        props: [],
        tiles: []
    };

    // push new chunk to array
    CURRENT_WORLD.loadedChunks.push(newChunk);
    const chunkSeed = CURRENT_WORLD.worldSeed + (chunkX * 12345) ^ (chunkY * 67890);

    // get entities in range
    const chunkEntities = CURRENT_WORLD.entities.filter(e => 
        e.x >= chunkWorldX && e.x < maxChunkX &&
        e.y >= chunkWorldY && e.y < maxChunkY
    );

    // get items in range (in case they have a hitbox)
    const chunkItems = CURRENT_WORLD.items.filter(e => 
        e.x >= chunkWorldX && e.x < maxChunkX &&
        e.y >= chunkWorldY && e.y < maxChunkY
    );

    // add elements (props, entities, items, structures)
    for (let localX = 0; localX < GEN_CHUNK_SIZE; localX += PROP_SPAWN_STEP) {
        for (let localY = 0; localY < GEN_CHUNK_SIZE; localY += PROP_SPAWN_STEP) {

            const worldX = chunkWorldX + localX;
            const worldY = chunkWorldY + localY;
            const biome = getBiomeAtLocation(worldX, worldY);

            // get biome props, entities and items
            const biomeProps = (biome.props || []).map(e => ({ ...e, type: "props" }));
            const biomeEntities = (biome.entities || []).map(e => ({ ...e, type: "entities" }));
            const biomeItems = (biome.items || []).map(e => ({ ...e, type: "items" }));
            const biomeStructures = (biome.structures || []).map(e => ({ ...e, type: "structures" }));

            const tileSeed = chunkSeed + (localX * 13) + (localY * 37);

            // shuffle structures
            const shuffledStructures = [...biomeStructures];
            for (let i = shuffledStructures.length - 1; i > 0; i--) {
                const j = Math.floor(pseudoRandom(tileSeed + i) * (i + 1));
                [shuffledStructures[i], shuffledStructures[j]] = [shuffledStructures[j], shuffledStructures[i]];
            }

            // shuffle entities, props and items
            let shuffledElements = [...biomeProps, ...biomeEntities, ...biomeItems];
            for (let i = shuffledElements.length - 1; i > 0; i--) {
                const j = Math.floor(pseudoRandom(tileSeed + i) * (i + 1));
                [shuffledElements[i], shuffledElements[j]] = [shuffledElements[j], shuffledElements[i]];
            }

            shuffledElements.unshift(...shuffledStructures);

            // loop props until one matches
            for (const propConfig of shuffledElements) {
                const elementId = propConfig.texture || propConfig.layout;
                const propSeed = tileSeed + elementId.length;
                const densityRoll = pseudoRandom(propSeed);

                let effectiveDensity = propConfig.density;
                if (propConfig.type === "entities") { // make entities rarer than props
                    effectiveDensity *= 0.5;
                }
                else if (propConfig.type === "structures") { // make structures even rarer
                    effectiveDensity *= 0.1; 
                }
                else if (propConfig.type === "items") { // make items a bit rarer than props
                    effectiveDensity *= 0.6; 
                }

                if (densityRoll < effectiveDensity) {
                    let finalX = worldX + (pseudoRandom(propSeed + 1) * PROP_SPAWN_STEP);
                    let finalY = worldY + (pseudoRandom(propSeed + 2) * PROP_SPAWN_STEP);

                    // get colliders
                    const chunkColliders = [...newChunk.props, ...newChunk.tiles, ...chunkEntities, ...chunkItems];

                    // define the element
                    if (propConfig.type === "structures") { // is a structure
                        const spawnSuccess = spawnStructureInChunk(
                            newChunk, 
                            propConfig, 
                            finalX, 
                            finalY, 
                            chunkWorldX, 
                            chunkWorldY, 
                            maxChunkX, 
                            maxChunkY, 
                            chunkColliders, 
                            propSeed
                        );
                        if (spawnSuccess) break;
                    }
                    else {

                        const elementScale = 1;

                        // get the prop's width and height
                        const asset = ASSETS[propConfig.type][propConfig.texture];
                        const halfWidth = asset.image.naturalWidth * PIXEL_SCALE * elementScale / 2;
                        const halfHeight = asset.image.naturalHeight * PIXEL_SCALE * elementScale / 2;

                        // clamp to make sure the prop stays in the chunk
                        finalX = Math.min(Math.max(finalX, chunkWorldX + halfWidth), maxChunkX - halfWidth);
                        finalY = Math.min(Math.max(finalY, chunkWorldY + halfHeight), maxChunkY - halfHeight);

                        if (propConfig.type === "props") { // is a prop
                            const element = newProp(finalX, finalY, propConfig.texture);
                            element.flipped = pseudoRandom(propSeed + 3) > 0.5;
                            element.scale = elementScale;

                            // collision check
                            if (getCollisionsFromArray(element, chunkColliders, true).length === 0) {
                                newChunk.props.push(element);
                                break;
                            }
                        }
                        else if (propConfig.type === "entities") { // is an entity
                            const element = Entities.newEntity(finalX, finalY, propConfig.texture, propConfig.displayName, propConfig.traits, propConfig.stats);
                            element.flipped = pseudoRandom(propSeed + 3) > 0.5;
                            element.scale = elementScale;

                            // collision check
                            if (getCollisionsFromArray(element, chunkColliders, true).length === 0) {
                                chunkEntities.push(element);
                                CURRENT_WORLD.entities.push(element);
                                break;
                            }
                        }
                        else if (propConfig.type === "items") { // is an item
                            const element = Items.newItem(finalX, finalY, propConfig.texture, propConfig.displayName, propConfig.displayDescription, propConfig.itemData);
                            //element.flipped = pseudoRandom(propSeed + 3) > 0.5;
                            element.scale = elementScale;

                            // collision check
                            if (getCollisionsFromArray(element, chunkColliders, true).length === 0) {
                                chunkItems.push(element);
                                CURRENT_WORLD.items.push(element);
                                break;
                            }
                        }
                    }
                }
            }
        }
    }
    return newChunk;
}

//#endregion







//#region STRUCTURE GENERATION


function spawnStructureInChunk(chunk, structureConfig, startX, startY, minX, minY, maxX, maxY, colliders, seed) {
    // get layout and rotation
    const rawLayout = ASSETS.structures[structureConfig.layout].layout;
    const rotations = Math.floor(pseudoRandom(seed + 4) * 4); // 0 to 3
    const rotatedLayout = rotateStructure(rawLayout, rotations);

    // calculate structure size
    const rows = rotatedLayout.length;
    const cols = rotatedLayout[0].length;
    const structureWidth = cols * TILE_SIZE;
    const structureHeight = rows * TILE_SIZE;

    // get grid
    const minGridX = Math.ceil(minX / TILE_SIZE) * TILE_SIZE;
    const minGridY = Math.ceil(minY / TILE_SIZE) * TILE_SIZE;
    const maxGridX = Math.floor((maxX - structureWidth) / TILE_SIZE) * TILE_SIZE;
    const maxGridY = Math.floor((maxY - structureHeight) / TILE_SIZE) * TILE_SIZE;

    // snap structure to grid
    const snappedX = Math.round(startX / TILE_SIZE) * TILE_SIZE;
    const snappedY = Math.round(startY / TILE_SIZE) * TILE_SIZE;

    // clamp to the chunk grid area
    const gridX = Math.min(Math.max(snappedX, minGridX), maxGridX);
    const gridY = Math.min(Math.max(snappedY, minGridY), maxGridY);

    const wallTexture = structureConfig.properties.walls.texture;
    const floorTexture = structureConfig.properties.floors.texture;
    const wallTint = structureConfig.properties.walls.color;
    const floorTint = structureConfig.properties.floors.color;

    // single collision check for entire structure
    const structureHitbox = {
        x: gridX + (structureWidth / 2),
        y: gridY + (structureHeight / 2),
        width: structureWidth,
        height: structureHeight,
        type: "structures"
    };

    // if overlaps with existing chunk elements, stop
    if (getCollisionsFromArray(structureHitbox, colliders, true).length > 0) {
        return false; // return false if failed
    }

    // generate tiles
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const cellType = rotatedLayout[r][c];
            if (cellType === " ") continue; // empty space

            const tileX = gridX + (c * TILE_SIZE) + (TILE_SIZE / 2);
            const tileY = gridY + (r * TILE_SIZE) + (TILE_SIZE / 2);

            if (cellType === "W") { // wall
                const wallTile = newTile(tileX, tileY, wallTexture, "wall", wallTint); // walls have collisions
                chunk.tiles.push(wallTile);
            } else if (cellType === "F") { // floor
                const floorTile = newTile(tileX, tileY, floorTexture, "floor", floorTint); // floors have no collisions
                chunk.tiles.push(floorTile);
            }
        }
    }

    return true; // return true if success
}


// rotates an array clockwise by 90 degrees 'rotations' times
function rotateStructure(grid, rotations) {
    let newGrid = grid;
    for (let r = 0; r < rotations; r++) {
        newGrid = newGrid[0].map((val, index) => newGrid.map(row => row[index]).reverse());
    }
    return newGrid;
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



import { CURRENT_WORLD } from "./state.js";
import { ASSETS } from "../assets/assets.js";
import { getVisibleBiomePoints, pseudoRandom } from "./worldgen.js";


//#region SETUP

// game canvas
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// drawing settings
export const PIXEL_SCALE = 10;
const CHUNK_SIZE = 500;
const MAP_CHUNK_SCALE = 32;
const CHUNK_PIXEL_SCALE = PIXEL_SCALE * 4;
const BIOME_BORDER_THICKNESS = 50;
const BIOME_BORDERS_NOISE = 0.04;
const MAX_NEW_CHUNKS = 50; // maximum amount of new chunks that can be generated per frame

// cache chunk images for faster rendering
const visualChunksCache = {}; 

// global staging canvas
const stagingCanvas = document.createElement('canvas');
const stagingCtx = stagingCanvas.getContext('2d');

//#endregion

// canvas resizing
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.imageSmoothingEnabled = false; 
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();


// main function to draw the game
export function drawGame() {

    // draw background based on biomes
    drawBiomeBackground();

    // only draw elements if zoomed-in
    if (CURRENT_WORLD.camera.smoothZoom >= 0.1) {

        // set render list
        const sortedDrawList = [CURRENT_WORLD.player, ...CURRENT_WORLD.props, ...CURRENT_WORLD.entities];

        // sort render list by Y position for depth
        sortedDrawList.sort((a, b) => {
            const bottomA = a.y + (ASSETS[a.type][a.texture].image.naturalHeight * PIXEL_SCALE * a.scale) / 2;
            const bottomB = b.y + (ASSETS[b.type][b.texture].image.naturalHeight * PIXEL_SCALE * b.scale) / 2;
            return bottomA - bottomB;
        });

        // draw render list
        for (const element of sortedDrawList) {
            drawWorldElement(element);
        }
    }
}





// function to draw entities, props, and items
function drawWorldElement(element) {

    const asset = ASSETS[element.type][element.texture];
    const camera = CURRENT_WORLD.camera;
    const currentZoom = camera.smoothZoom;

    // get real size
    const realWidth = currentZoom * asset.image.naturalWidth * PIXEL_SCALE * element.scale;
    const realHeight = currentZoom * asset.image.naturalHeight * PIXEL_SCALE * element.scale;
    
    // get exact drawing location
    const drawX = (canvas.width / 2) + ((element.x - camera.x) * currentZoom) - (realWidth / 2);
    const drawY = (canvas.height / 2) + ((element.y - camera.y) * currentZoom) - (realHeight / 2);
    
    ctx.drawImage(asset.image, drawX, drawY, realWidth, realHeight);
}









//#region DRAWING GROUND (BIOMES)

// main function to draw the ground
function drawBiomeBackground() {
    const cam = CURRENT_WORLD.camera;
    const zoom = cam.smoothZoom;
    const isMapMode = zoom < 0.1; 
    
    // viewport calculations
    const viewW = canvas.width / zoom;
    const viewH = canvas.height / zoom;
    const worldLeft = cam.x - (viewW / 2) - 200;
    const worldTop = cam.y - (viewH / 2) - 200;
    const worldRight = cam.x + (viewW / 2) + 200;
    const worldBottom = cam.y + (viewH / 2) + 200;

    // draw background
    ctx.fillStyle = "#212121";
    ctx.fillRect(0, 0, viewW, viewH);

    const currentChunkSize = isMapMode ? (CHUNK_SIZE * MAP_CHUNK_SCALE) : CHUNK_SIZE;

    // grid calculations
    const startChunkX = Math.floor(worldLeft / currentChunkSize);
    const endChunkX = Math.floor(worldRight / currentChunkSize);
    const startChunkY = Math.floor(worldTop / currentChunkSize);
    const endChunkY = Math.floor(worldBottom / currentChunkSize);

    let renderedNewChunk = 0;

    for (let cy = startChunkY; cy <= endChunkY; cy++) {
        for (let cx = startChunkX; cx <= endChunkX; cx++) {
            
            const chunkKey = `${cx},${cy},${isMapMode ? 'map' : 'game'}`; // includes 'map' or 'game' so we don't mix them up

            const worldX = cx * currentChunkSize;
            const worldY = cy * currentChunkSize;
            
            const drawX = (canvas.width / 2) + ((worldX - cam.x) * zoom);
            const drawY = (canvas.height / 2) + ((worldY - cam.y) * zoom);
            const size = currentChunkSize * zoom;

            // get chunk if not in memory
            if (!visualChunksCache[chunkKey]) {

                if (renderedNewChunk > MAX_NEW_CHUNKS) {
                    continue;
                }
                else {
                    renderedNewChunk++;
                }
                
                visualChunksCache[chunkKey] = renderBiomeChunk(cx, cy, currentChunkSize, isMapMode);
            }

            const img = visualChunksCache[chunkKey];
            
            ctx.drawImage(img, Math.floor(drawX), Math.floor(drawY), Math.ceil(size)+1, Math.ceil(size)+1); 
        }
    }
}


// get the ground color at a certain location
function renderBiomeChunk(cx, cy, size, isMapMode) {
    const chunkWorldX = cx * size;
    const chunkWorldY = cy * size;

    // get resolution
    const blocksPerChunk = isMapMode ? (size / CHUNK_SIZE) : (size / CHUNK_PIXEL_SCALE);
    
    // calculate how big each pixel is in world units
    const pixelSize = size / blocksPerChunk;

    // setup staging canvas
    stagingCanvas.width = blocksPerChunk;
    stagingCanvas.height = blocksPerChunk;

    // get biome data
    const points = getVisibleBiomePoints(
        chunkWorldX + size / 2, 
        chunkWorldY + size / 2, 
        size, size
    );

    // draw
    for (let x = 0; x < blocksPerChunk; x++) {
        for (let y = 0; y < blocksPerChunk; y++) {
            
            const tileWorldX = chunkWorldX + (x * pixelSize);
            const tileWorldY = chunkWorldY + (y * pixelSize);

            let offsetX = 0;
            let offsetY = 0;

            if (!isMapMode) {
                const warpStrength = 50; 
                const warpFreq = 0.007; 
                offsetX = Math.sin(tileWorldY * warpFreq) * warpStrength;
                offsetY = Math.cos(tileWorldX * warpFreq) * warpStrength;
            }

            const color = getGroundColor(
                tileWorldX + pixelSize / 2 + offsetX, 
                tileWorldY + pixelSize / 2 + offsetY,
                points,
                isMapMode
            );
            
            stagingCtx.fillStyle = color;
            stagingCtx.fillRect(x, y, 1, 1);
        }
    }

    // get canvas as an image
    const img = new Image();
    img.src = stagingCanvas.toDataURL();
    return img;
}



// function to get the color of the ground at a certain x, y
function getGroundColor(x, y, points, isLowQuality) {
    let closestDistSq = Infinity;
    let secondClosestDistSq = Infinity;
    
    let closestPoint = null;
    let secondClosestPoint = null;

    // find the two closest biome centers
    for (const center of points) {
        const dx = x - center.x;
        const dy = y - center.y;
        
        const distSq = (dx*dx) + (dy*dy);

        if (distSq < closestDistSq) {
            secondClosestDistSq = closestDistSq;
            secondClosestPoint = closestPoint;
            closestDistSq = distSq;
            closestPoint = center;
        } else if (distSq < secondClosestDistSq) {
            secondClosestDistSq = distSq;
            secondClosestPoint = center;
        }
    }

    if (!closestPoint) return "#000000";

    let finalColor = closestPoint.visuals.groundColor;
    let intensity = closestPoint.visuals.groundNoiseIntensity;

    // only calculate borders if high quality
    if (!isLowQuality) {
        const closestDist = Math.sqrt(closestDistSq);
        const secondClosestDist = Math.sqrt(secondClosestDistSq);
        const borderThickness = BIOME_BORDER_THICKNESS;

        // check for border
        if (secondClosestDist - closestDist < borderThickness * 4) {
            
            if (secondClosestPoint && closestPoint.biomeName !== secondClosestPoint.biomeName) {
                
                // find distance between the two biome centers
                const distBetweenCenters = Math.sqrt(
                    Math.pow(closestPoint.x - secondClosestPoint.x, 2) + 
                    Math.pow(closestPoint.y - secondClosestPoint.y, 2)
                );

                // get distance from the pixel to the border line
                const distToEdge = (secondClosestDist * secondClosestDist - closestDist * closestDist) / (2 * distBetweenCenters);
                
                // check against thickness
                if (distToEdge < borderThickness) {
                    finalColor = getDarkMixedColor(closestPoint.visuals.groundColor, secondClosestPoint.visuals.groundColor);
                    intensity = BIOME_BORDERS_NOISE;
                }
            }
        }
        
        return applyNoiseToColor(finalColor, intensity, x, y);
    }
    return finalColor;
}


// function for biomes border
function getDarkMixedColor(hex1, hex2) {
    const parse = (c) => [
        parseInt(c.slice(1, 3), 16),
        parseInt(c.slice(3, 5), 16),
        parseInt(c.slice(5, 7), 16)
    ];
    
    const [r1, g1, b1] = parse(hex1);
    const [r2, g2, b2] = parse(hex2);

    const light = 0.8;

    const r = Math.floor(((r1 + r2) / 2) * light);
    const g = Math.floor(((g1 + g2) / 2) * light);
    const b = Math.floor(((b1 + b2) / 2) * light);

    return `rgb(${r},${g},${b})`;
}


// function to make the ground feel noisy instead of just using one color
function applyNoiseToColor(color, intensity, x, y) {
    if (!intensity || intensity <= 0) return color;

    const seed = (x * 12.9898 + y * 78.233);
    const randomVal = pseudoRandom(seed);
    const noise = (randomVal * 2) - 1; 
    const factor = 1 + (noise * intensity); 

    let r, g, b;
    if (color.startsWith("#")) {
        const bigint = parseInt(color.slice(1), 16);
        r = (bigint >> 16) & 255;
        g = (bigint >> 8) & 255;
        b = bigint & 255;
    } else if (color.startsWith("rgb")) {
        [r, g, b] = color.match(/\d+/g).map(Number);
    } else {
        return color;
    }

    r = Math.min(255, Math.max(0, Math.floor(r * factor)));
    g = Math.min(255, Math.max(0, Math.floor(g * factor)));
    b = Math.min(255, Math.max(0, Math.floor(b * factor)));

    return `rgb(${r},${g},${b})`;
}


//#endregion

import { CURRENT_WORLD, DEBUG_MODE } from "./state.js";
import { ASSETS } from "../assets/assets.js";
import { getVisibleBiomePoints, pseudoRandom, GEN_CHUNK_SIZE } from "./worldgen.js";
import { ENTITY_ACTION_COLORS } from "./entities.js";


//#region SETUP

// game canvas
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// drawing settings
export const PIXEL_SCALE = 10;
const CHUNK_SIZE = 500;
const MAP_CHUNK_SCALE = 32;
const CHUNK_PIXEL_SCALE = PIXEL_SCALE * 2;
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

    const cam = CURRENT_WORLD.isMapOpen ? CURRENT_WORLD.mapCamera : CURRENT_WORLD.camera;

    // draw background based on biomes
    drawBiomeBackground();

    // only draw elements if zoomed-in
    if (cam.smoothZoom >= 0.1) {

        // set render list
        const visibleElements = getVisibleElements();

        // draw floors first
        const floorElements = visibleElements.filter(e => e.type === "tiles" && e.layer === "floor");
        for (const floor of floorElements) {
            drawWorldElement(floor);
        }

        // then draw wall shadows
        drawWallShadows();

        // then draw the rest in order of Y (depth)
        const verticalElements = visibleElements.filter(e => !(e.type === "tiles" && e.layer === "floor"));
        verticalElements.sort((a, b) => {
            const bottomA = a.y + (ASSETS[a.type][a.texture].image.naturalHeight * PIXEL_SCALE * a.scale) / 2;
            const bottomB = b.y + (ASSETS[b.type][b.texture].image.naturalHeight * PIXEL_SCALE * b.scale) / 2;
            return bottomA - bottomB;
        });
        
        for (const element of verticalElements) {
            drawWorldElement(element);
        }
    }
    else {
        drawMapIndicators();
    }

    if (DEBUG_MODE && cam.smoothZoom >= 0.1) {
        drawChunkBorders();
    }
}




// draws entities, props, and items
function drawWorldElement(element) {
    const asset = ASSETS[element.type][element.texture];
    const cam = CURRENT_WORLD.isMapOpen ? CURRENT_WORLD.mapCamera : CURRENT_WORLD.camera;
    const currentZoom = cam.smoothZoom;

    // get reak size
    const realWidth = currentZoom * asset.image.naturalWidth * PIXEL_SCALE * element.scale;
    const realHeight = currentZoom * asset.image.naturalHeight * PIXEL_SCALE * element.scale;
    
    // get exact drawing location
    const centerX = (canvas.width / 2) + ((element.x - cam.x) * currentZoom);
    const centerY = (canvas.height / 2) + ((element.y - cam.y) * currentZoom);
    
    // save current canvas state
    ctx.save();

    // move canvas origin to the center of the element
    ctx.translate(centerX, centerY);

    // if flipped, flip
    if (element.flipped) {
        ctx.scale(-1, 1);
    }

    // get final image
    let finalImageToDraw = asset.image;
    if (element.tint) {
        finalImageToDraw = getTintedImage(asset, element.tint);
    }

    // draw
    ctx.drawImage(finalImageToDraw, -realWidth / 2, -realHeight / 2, realWidth + 1, realHeight + 1);
    

    // restore canvas state so other elements don't get affected
    ctx.restore();


    // entity stuff
    if (element.type == "entities") {

        if (element.displayName) {
            const text = element.displayName;
            const textY = centerY - realHeight / 2 - 15 * currentZoom
            canvasWrite(text, centerX, textY, "#ffffff", 50 * currentZoom, "center")
        }

        // debug
        if (DEBUG_MODE && element.currentAction) {
            const text = element.currentAction.type
            const textY = centerY + realHeight / 2 + 45 * currentZoom
            canvasWrite(text, centerX, textY, ENTITY_ACTION_COLORS[element.currentAction.type], 50 * currentZoom, "center")
        }

    }
}




// function to write text on the game canvas
function canvasWrite(text, x, y, color, fontSize, textAlign) {

    ctx.font = `${fontSize}px 'Jersey 10'`;
    ctx.textAlign = textAlign;

    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillText(
        text, 
        x + 0.07 * fontSize, 
        y + 0.07 * fontSize
    );
    ctx.fillStyle = color;
    ctx.fillText(
        text, 
        x, 
        y
    );
}





// returns all entities, items and props visible on screen
export function getVisibleElements() {
    const cam = CURRENT_WORLD.isMapOpen ? CURRENT_WORLD.mapCamera : CURRENT_WORLD.camera;
    const zoom = cam.smoothZoom;

    // get visible screen area in world coordinates
    const viewW = canvas.width / zoom;
    const viewH = canvas.height / zoom;

    // set boundaries with a buffer so elements don't pop in/out at the edges
    const viewLeft = cam.x - (viewW / 2) - 200;
    const viewRight = cam.x + (viewW / 2) + 200;
    const viewTop = cam.y - (viewH / 2) - 200;
    const viewBottom = cam.y + (viewH / 2) + 200;

    const chunkSize = GEN_CHUNK_SIZE;
    const startChunkX = Math.floor(viewLeft / chunkSize);
    const endChunkX = Math.floor(viewRight / chunkSize);
    const startChunkY = Math.floor(viewTop / chunkSize);
    const endChunkY = Math.floor(viewBottom / chunkSize);

    const visibleProps = [];
    const visibleTiles = [];
    for (let cx = startChunkX; cx <= endChunkX; cx++) {
        for (let cy = startChunkY; cy <= endChunkY; cy++) {
            const chunkKey = `${cx},${cy}`;
            const chunk = CURRENT_WORLD.loadedChunks.find(c => c.id === chunkKey);
            if (chunk) {
                visibleProps.push(...chunk.props);
                visibleTiles.push(...chunk.tiles);
            }
        }
    }

    const isVisible = (element) => {
        return element.x >= viewLeft && element.x <= viewRight &&
               element.y >= viewTop && element.y <= viewBottom;
    };

    const visibleEntities = CURRENT_WORLD.entities.filter(isVisible);
    const visibleItems = CURRENT_WORLD.items.filter(isVisible);

    return [
        CURRENT_WORLD.player,
        ...visibleProps,
        ...visibleTiles,
        ...visibleEntities,
        ...visibleItems
    ];
}





function drawWallShadows() {
    const cam = CURRENT_WORLD.isMapOpen ? CURRENT_WORLD.mapCamera : CURRENT_WORLD.camera;
    const visibleElements = getVisibleElements();
    // set shadow properties
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
    ctx.shadowBlur = 35 * cam.smoothZoom;
    ctx.shadowOffsetX = 0; 
    ctx.shadowOffsetY = 0
    ctx.fillStyle = "black";
    const wallElements = visibleElements.filter(e => e.type === "tiles" && e.layer === "wall");
    for (const wall of wallElements) {
        const asset = ASSETS[wall.type][wall.texture];
        const currentZoom = cam.smoothZoom;

        // get pixel size of the wall
        const realWidth = currentZoom * asset.image.naturalWidth * PIXEL_SCALE * wall.scale;
        const realHeight = currentZoom * asset.image.naturalHeight * PIXEL_SCALE * wall.scale;

        // calculate screen position
        const centerX = (canvas.width / 2) + ((wall.x - cam.x) * currentZoom);
        const centerY = (canvas.height / 2) + ((wall.y - cam.y) * currentZoom);

        // draw shadow
        ctx.fillRect(
            centerX - (realWidth / 2) + 1,
            centerY - (realHeight / 2) + 1,
            realWidth - 1,
            realHeight - 1
        );
    }
    ctx.restore();
}



// Cache for colorized images to prevent game lag
const tintCache = {};

// Generates and caches a colorized version of an image
function getTintedImage(asset, color) {
    // Create unique key for this texture and color
    const cacheKey = `${asset.image.src}_${color}`;

    // Return cached version if we already generated it
    if (tintCache[cacheKey]) return tintCache[cacheKey];

    // Create a new offscreen canvas for the tinted texture
    const tintCanvas = document.createElement('canvas');
    const tintCtx = tintCanvas.getContext('2d');
    tintCanvas.width = asset.image.naturalWidth;
    tintCanvas.height = asset.image.naturalHeight;

    // 1. Draw base image
    tintCtx.drawImage(asset.image, 0, 0);

    // 2. Apply color tint (source-atop ensures it only colors visible pixels, ignoring transparency)
    tintCtx.globalCompositeOperation = "source-atop";
    tintCtx.fillStyle = color;
    tintCtx.fillRect(0, 0, tintCanvas.width, tintCanvas.height);

    // 3. Multiply original image back on top to restore shadows, wood grain, or brick textures
    tintCtx.globalCompositeOperation = "multiply";
    tintCtx.drawImage(asset.image, 0, 0);

    // Save to cache and return
    tintCache[cacheKey] = tintCanvas;
    return tintCanvas;
}



//#region DRAWING GROUND (BIOMES)

// main function to draw the ground
function drawBiomeBackground() {
    const cam = CURRENT_WORLD.isMapOpen ? CURRENT_WORLD.mapCamera : CURRENT_WORLD.camera;
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





// debug function to show the chunk borders
function drawChunkBorders() {
    const cam = CURRENT_WORLD.isMapOpen ? CURRENT_WORLD.mapCamera : CURRENT_WORLD.camera;
    const zoom = cam.smoothZoom;
    
    // get visible screen area in world coordinates
    const viewW = canvas.width / zoom;
    const viewH = canvas.height / zoom;
    const worldLeft = cam.x - (viewW / 2);
    const worldTop = cam.y - (viewH / 2);
    const worldRight = cam.x + (viewW / 2);
    const worldBottom = cam.y + (viewH / 2);

    const chunkSize = GEN_CHUNK_SIZE;

    // get visible chunks
    const startChunkX = Math.floor(worldLeft / chunkSize);
    const endChunkX = Math.floor(worldRight / chunkSize);
    const startChunkY = Math.floor(worldTop / chunkSize);
    const endChunkY = Math.floor(worldBottom / chunkSize);

    ctx.save();
    ctx.lineWidth = 1; // Thickness of the border lines
    ctx.strokeStyle = "rgba(255, 0, 0, 0.3)"; // Red, semi-transparent lines
    
    // Draw Vertical Lines
    for (let cx = startChunkX; cx <= endChunkX + 1; cx++) {
        const worldX = cx * chunkSize;
        const drawX = (canvas.width / 2) + ((worldX - cam.x) * zoom);

        ctx.beginPath();
        ctx.moveTo(drawX, 0);
        ctx.lineTo(drawX, canvas.height);
        ctx.stroke();
    }

    // Draw Horizontal Lines
    for (let cy = startChunkY; cy <= endChunkY + 1; cy++) {
        const worldY = cy * chunkSize;
        const drawY = (canvas.height / 2) + ((worldY - cam.y) * zoom);

        ctx.beginPath();
        ctx.moveTo(0, drawY);
        ctx.lineTo(canvas.width, drawY);
        ctx.stroke();
    }
    ctx.restore();

    // Label each chunk with its ID using canvasWrite
    const fontSize = Math.max(15, 30 * zoom);;
    
    for (let cx = startChunkX; cx <= endChunkX; cx++) {
        for (let cy = startChunkY; cy <= endChunkY; cy++) {
            const worldX = cx * chunkSize;
            const worldY = cy * chunkSize;

            // Calculate the screen position for the top-left of the chunk
            const drawX = (canvas.width / 2) + ((worldX - cam.x) * zoom) + (fontSize / 2);
            const drawY = (canvas.height / 2) + ((worldY - cam.y) * zoom) + fontSize;

            canvasWrite(`Chunk: ${cx}, ${cy}`, drawX, drawY, "rgba(255, 0, 0, 0.7)", fontSize, "left");
        }
    }
}

//#endregion







//#region MAP


const mapIndicators = {
    red: "../assets/ui/map/red_map_indicator.png",
    orange: "../assets/ui/map/orange_map_indicator.png",
    yellow: "../assets/ui/map/yellow_map_indicator.png",
    green: "../assets/ui/map/green_map_indicator.png",
    aqua: "../assets/ui/map/aqua_map_indicator.png",
    blue: "../assets/ui/map/blue_map_indicator.png",
    purple: "../assets/ui/map/purple_map_indicator.png"
};


function drawMapIndicators() {
    const player = CURRENT_WORLD.player;

    const drawIndicators = [];
    drawIndicators.push(newMapIndicator(0, 0, mapIndicators.purple, "Spawn"));
    drawIndicators.push(newMapIndicator(player.x, player.y, mapIndicators.green, "You"));

    // order by y
    drawIndicators.sort((a, b) => a.y - b.y);

    for (const indicator of drawIndicators) {
        drawMapIndicator(indicator);
    }
}


function newMapIndicator(x, y, src, label) {
    return {
        x: x,
        y: y,
        src: src,
        label: label
    }
}

const mapIndicatorsCache = {};
function drawMapIndicator(indicator) {


    // load image
    if (!mapIndicatorsCache[indicator.src]) {
        const cacheIndicatorImg = new Image();
        cacheIndicatorImg.src = indicator.src;
        mapIndicatorsCache[indicator.src] = cacheIndicatorImg;
    }
    const image = mapIndicatorsCache[indicator.src];

    const cam = CURRENT_WORLD.mapCamera;
    const zoom = cam.smoothZoom;

    const screenX = (canvas.width / 2) + ((indicator.x - cam.x) * zoom);
    const screenY = (canvas.height / 2) + ((indicator.y - cam.y) * zoom);
    
    const iconHeight = 35; 
    const aspectRatio = image.naturalWidth / image.naturalHeight;
    const iconWidth = iconHeight * aspectRatio; 

    ctx.drawImage(
        image,
        screenX - (iconWidth / 2),
        screenY - (iconHeight),
        iconWidth,
        iconHeight
    );

    canvasWrite(indicator.label, screenX, screenY - iconHeight - 8, "white", 25, "center");
}

//#endregion



import * as World from "./worldgen.js";
import * as Game from "./game.js";
import * as Player from "./player.js";
import { generateWorldFromPrompt } from "../ai/prompts.js";



//#region MENUS BUTTON CLICKS

export async function menusBtns() {

    // mini helper to get the parent page of any clicked element
    const getPage = (e) => e.target.closest('.page');

    //#region MAIN MENU

    // 'start new adventure'
    document.getElementById("newWorldBtn").addEventListener('click', (e) => openNewWorldSettings(getPage(e)));

    // 'load existing world'
    document.getElementById("worldsListBtn").addEventListener('click', (e) => openWorldsList(getPage(e)));

    // 'settings'
    document.getElementById("gameSettings").addEventListener('click', (e) => openGameSettings(getPage(e)));

    // back to main menu
    document.querySelectorAll('.backMainMenuBtn').forEach(btn => btn.addEventListener('click', (e) => backMainMenu(getPage(e))));

    //#endregion


    //#region NEW WORLD SETTINGS

    // generate world
    document.getElementById("generateNewWorld").addEventListener('click', (e) => generateNewWorld(getPage(e)));

    //#endregion
}

//#endregion





// open the new world settings menu
async function openNewWorldSettings(currentPage) {

    // close current page
    currentPage.style.display = "none";

    // open new world settings menu
    document.getElementById("newWorldSettingsPage").style.display = "flex";


    // get world presets
    const presetWorldsFile = await fetch("./ai/worldStructureExamples.json");
    const presetWorldsObject = await presetWorldsFile.json();
    const worldTypes = Object.keys(presetWorldsObject);

    // populate world presets
    const presetSelect = document.getElementById('worldPreset');
    worldTypes.forEach(type => {
        const newOption = document.createElement('option');
        newOption.value = type;
        newOption.textContent = "Preset: " + type;
        presetSelect.appendChild(newOption);
    });
}



// open the existing worlds menu
async function openWorldsList(currentPage) {

    // close current page
    currentPage.style.display = "none";
}



// open the game settings menu
async function openGameSettings(currentPage) {

    // close current page
    currentPage.style.display = "none";
}



// back to main menu
async function backMainMenu(currentPage) {
 
    // close current page
    currentPage.style.display = "none";

    // open main menu
    document.getElementById("mainMenuPage").style.display = "flex";
}



// generate new world (loading screen)
async function generateNewWorld(currentPage) {

    // close current page
    currentPage.style.display = "none";

    // display loading screen
    document.getElementById("newWorldLoadingPage").style.display = "flex";

    // get world preset
    const selectedWorldPreset = document.getElementById("worldPreset").value;
    if (selectedWorldPreset === "custom") {
        // generate world with ai
        const worldPrompt = document.getElementById("worldPrompt").value;
        const newWorldConfig = await generateWorldFromPrompt(worldPrompt);
        World.generateNewWorld(newWorldConfig);
    }
    else {
        // generate world from preset
        const newWorldConfigFile = await fetch("./ai/worldStructureExamples.json");
        const newWorldConfig = await newWorldConfigFile.json();
        World.generateNewWorld(newWorldConfig[selectedWorldPreset].output);

    }

    // update inventory display
    Player.updateInventoryDisplay();

    // start game loop
    requestAnimationFrame(Game.gameLoop);

    // hide loading screen
    document.getElementById("newWorldLoadingPage").style.display = "none";

    // show game canvas
    document.getElementById("gamePage").style.display = "flex";
}
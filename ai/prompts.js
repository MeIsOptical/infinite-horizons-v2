
import * as Storage from "../scripts/storage.js";
import { ASSETS } from "../assets/assets.js";
import { API_URL } from "../scripts/state.js";


export async function generateWorldFromPrompt(prompt) {

    // get session
    const loginToken = await Storage.getItem(Storage.STORES.AUTH, "jwt");
    if (!loginToken) return; // stop if no token

    // set url
    const url = `${API_URL}/prompt/new-world`;

    // get world structure
    const worldStructureFile = await fetch("./ai/expectedWorldStructure.json");
    const worldStructure = await worldStructureFile.json();

    // get world examples
    const worldExamplesFile = await fetch("./ai/worldStructureExamples.json");
    const worldExamples = await worldExamplesFile.json();

    // format body
    const formattedBody = {};
    formattedBody.worldPrompt = prompt;
    formattedBody.availableProps = Object.keys(ASSETS.props);
    formattedBody.availableEntities = Object.keys(ASSETS.entities);
    formattedBody.availableItems = Object.keys(ASSETS.items);
    formattedBody.availableTiles = Object.keys(ASSETS.tiles);
    formattedBody.availableStructures = Object.keys(ASSETS.structures);
    formattedBody.worldStructure = worldStructure;
    formattedBody.worldExamples = worldExamples

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${loginToken}`
        },
        body: JSON.stringify(formattedBody)
    });

    const result = await response.json();

    let rawContentString = result.data.choices[0].message.content;
    rawContentString = rawContentString.replace(/```json/gi, "").replace(/```/g, "").trim();
    const newWorldData = JSON.parse(rawContentString);

    return newWorldData;

}
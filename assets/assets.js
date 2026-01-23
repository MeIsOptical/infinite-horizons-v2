



export const ASSETS = {};

export async function loadAllAssets() {

    try {

        const assetsFile = await fetch("./assets/assets.json");
        const manifest = await assetsFile.json();

        const promises = [];

        // loop all categories
        for (const category in manifest) {

            ASSETS[category] = {};

            // loop all assets in category
            for (const asset in manifest[category]) {

                // grab asset properties
                const data = manifest[category][asset];

                // set image path
                const path = `./assets/${category}/${asset}.png`;

                // load image
                const p = new Promise((resolve) => {
                    const img = new Image();
                    img.src = path;

                    img.onload = () => {
                        // store image with the data
                        ASSETS[category][asset] = {
                            ...data,
                            image: img
                        };
                        resolve();
                    };

                    img.onerror = () => {
                        console.error(`Failed to load asset: ${path}`);
                        // store data even if image fails to prevent crashes
                        ASSETS[category][asset] = {
                            ...data,
                            image: null 
                        };
                        resolve();
                    };
                });

                promises.push(p);

            }

        }

        await Promise.all(promises);

    }
    catch (error) {
        console.error("Failed to load game assets:\n", error);
    }
}